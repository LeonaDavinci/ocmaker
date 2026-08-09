"""Parse Astro's `application/json+devalue` state blob into plain Python data."""
import json
import re
import sys

UNDEFINED, HOLE, NAN, POS_INF, NEG_INF, NEG_ZERO = -1, -2, -3, -4, -5, -6


class Undef:
    def __repr__(self):
        return "undefined"


UNDEF = Undef()


def unflatten(values):
    hydrated = {}

    def hydrate(index):
        if index == UNDEFINED:
            return UNDEF
        if index == NAN:
            return float("nan")
        if index == POS_INF:
            return float("inf")
        if index == NEG_INF:
            return float("-inf")
        if index == NEG_ZERO:
            return -0.0
        if index in hydrated:
            return hydrated[index]

        value = values[index]
        if not isinstance(value, (list, dict)):
            hydrated[index] = value
            return value

        if isinstance(value, list):
            if len(value) and isinstance(value[0], str):
                tag = value[0]
                if tag == "Date":
                    hydrated[index] = value[1]
                elif tag == "Set":
                    out = []
                    hydrated[index] = out
                    out.extend(hydrate(n) for n in value[1:])
                elif tag == "Map":
                    out = {}
                    hydrated[index] = out
                    for i in range(1, len(value), 2):
                        k = hydrate(value[i])
                        v = hydrate(value[i + 1])
                        out[k if isinstance(k, (str, int, float, bool)) else str(k)] = v
                elif tag == "RegExp":
                    hydrated[index] = {"__regexp": value[1:]}
                elif tag == "Object":
                    hydrated[index] = value[1]
                elif tag == "BigInt":
                    hydrated[index] = int(value[1])
                elif tag == "null":
                    out = {}
                    hydrated[index] = out
                    for i in range(1, len(value), 2):
                        out[hydrate(value[i])] = hydrate(value[i + 1])
                else:
                    out = {}
                    hydrated[index] = out
                    out["__custom_" + tag] = [hydrate(n) for n in value[1:]]
            else:
                arr = []
                hydrated[index] = arr
                for n in value:
                    arr.append(None if n == HOLE else hydrate(n))
        else:
            obj = {}
            hydrated[index] = obj
            for k, n in value.items():
                obj[k] = hydrate(n)
        return hydrated[index]

    return hydrate(0)


def strip_undef(o):
    if isinstance(o, Undef):
        return None
    if isinstance(o, dict):
        return {k: strip_undef(v) for k, v in o.items()}
    if isinstance(o, list):
        return [strip_undef(v) for v in o]
    return o


def main():
    html = open(sys.argv[1], encoding="utf-8").read()
    m = re.search(
        r'<script[^>]*type="application/json\+devalue"[^>]*>(.*?)</script>',
        html,
        re.S,
    )
    if not m:
        raise SystemExit("devalue blob not found")
    raw = m.group(1)
    data = unflatten(json.loads(raw))
    data = strip_undef(data)
    json.dump(data, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("top-level keys:", list(data.keys()) if isinstance(data, dict) else type(data))


if __name__ == "__main__":
    main()
