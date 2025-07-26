suite("setting text", () => {
  benchmark(
    "native",
    () => {
      this.div.textContent = `random ${Math.random()} value`;
    },
    {
      setup() {
        this.div = document.createElement("div");
      },
    }
  );

  benchmark(
    "swap",
    () => {
      htmxJson.swap(this.div, {});
    },
    {
      setup() {
        this.div = document.createElement("div");
        this.div.innerHTML = `<span .text-content="\`random \${Math.random()} value\`"></span>`;
        htmxJson.swap(this.div, {});
      },
    }
  );
});
