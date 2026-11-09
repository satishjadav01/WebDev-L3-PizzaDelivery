const pending = new Map();

/** Loads an external script once; later callers share the same promise. */
export function loadScript(src) {
  if (!pending.has(src)) {
    pending.set(
      src,
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => {
      pending.delete(src);
        reject(new Error(`The payment window could not be loaded.Check your
           connection.`));
   };
        document.head.appendChild(script);
      }),
    );
  }
  return pending.get(src);
}
