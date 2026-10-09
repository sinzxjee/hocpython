export const PYTHON_HARNESS = String.raw`
import sys, io, json, builtins, traceback, math
_payload = json.loads(_task_payload)
_results = []
def _matches(actual, expected):
    def _equal(a, b):
        if isinstance(a, bool) or isinstance(b, bool):
            return type(a) is type(b) and a == b
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-6)
        if isinstance(a, list) and isinstance(b, list):
            return len(a) == len(b) and all(_equal(x, y) for x, y in zip(a, b))
        if isinstance(a, dict) and isinstance(b, dict):
            return a.keys() == b.keys() and all(_equal(a[k], b[k]) for k in a)
        return type(a) is type(b) and a == b
    try:
        return _equal(json.loads(actual), json.loads(expected))
    except (ValueError, TypeError):
        a, b = actual.split(), expected.split()
        if len(a) != len(b):
            return False
        for x, y in zip(a, b):
            if x == y:
                continue
            try:
                if not math.isclose(float(x), float(y), rel_tol=1e-9, abs_tol=1e-6):
                    return False
            except ValueError:
                return False
        return True

class _LimitedOutput(io.StringIO):
    def write(self, value):
        if self.tell() + len(value) > 64000:
            raise RuntimeError("Đầu ra vượt quá 64 KB.")
        return super().write(value)

for _test in _payload["tests"]:
    _old_out, _old_err, _old_in = sys.stdout, sys.stderr, sys.stdin
    _out = _LimitedOutput()
    _error = ""
    _steps = [0]
    def _trace(frame, event, arg):
        if event == "line" and frame.f_code.co_filename == "<learner>":
            _steps[0] += 1
            if _steps[0] > 250000:
                raise RuntimeError("Chương trình chạy quá nhiều bước. Kiểm tra vòng lặp.")
        return _trace
    try:
        _lines = iter(_test.get("input", "").splitlines())
        def _input(prompt=""):
            try:
                return next(_lines)
            except StopIteration:
                raise EOFError("Thiếu dữ liệu đầu vào. Mỗi input() cần một dòng.")
        _builtins = dict(vars(builtins))
        _builtins["input"] = _input
        _ns = {"__name__": "__main__", "__builtins__": _builtins}
        sys.stdout = sys.stderr = _out
        sys.stdin = io.StringIO(_test.get("input", ""))
        sys.settrace(_trace)
        exec(compile(_payload["code"], "<learner>", "exec"), _ns, _ns)
        if _payload.get("mode") == "function":
            _value = eval(_test["expression"], _ns, _ns)
            _out.write(json.dumps(_value, ensure_ascii=False))
    except BaseException:
        _error = traceback.format_exc(limit=5)[-4000:]
    finally:
        sys.settrace(None)
        sys.stdout, sys.stderr, sys.stdin = _old_out, _old_err, _old_in
    _stdout = _out.getvalue()
    _results.append({"stdout": _stdout, "error": _error, "passed": not _error and _matches(_stdout, _test.get("expected", ""))})
_runner_result = json.dumps(_results, ensure_ascii=False)
`;


