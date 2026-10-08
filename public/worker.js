import { PYTHON_HARNESS } from './runner-core.js';
self.onmessage = async ({ data }) => {
  try {
    const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs');
    const py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/' });
    self.postMessage({ type: 'ready' });
    // Exercise code only runs in this disposable worker, never in the Node server.
    // Runtime files have already loaded. Disable common network APIs for learner code.
    self.fetch = () => Promise.reject(new Error('Network disabled while running Python.'));
    self.XMLHttpRequest = undefined;
    self.WebSocket = undefined;
    py.globals.set('_task_payload', JSON.stringify(data));
    await py.runPythonAsync(PYTHON_HARNESS);
    const results = JSON.parse(py.globals.get('_runner_result'));
    self.postMessage({ type: 'result', results });
  } catch (error) {
    self.postMessage({ type: 'error', error: String(error.message || error) });
  }
};

