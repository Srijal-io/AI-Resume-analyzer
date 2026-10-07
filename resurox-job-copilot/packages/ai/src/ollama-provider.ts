export interface OllamaOptions {
  host?: string;
  model?: string;
  timeoutMs?: number;
}

export class OllamaProvider {
  private host: string;
  private model: string;
  private timeoutMs: number;

  constructor(options: OllamaOptions = {}) {
    this.host = options.host || process.env.OLLAMA_HOST || "http://localhost:11434";
    this.model = options.model || process.env.OLLAMA_MODEL || "gemma2:2b";
    this.timeoutMs = options.timeoutMs || 25000;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.host}/api/version`, {
        signal: AbortSignal.timeout(2500)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateJson<T>(prompt: string, schemaDescription = ""): Promise<{ data: T; repaired: boolean }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          format: "json",
          stream: false,
          options: {
            temperature: 0.1,
            num_ctx: 4096
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}: ${await response.text()}`);
      }

      const body = (await response.json()) as { response: string };
      const rawText = body.response.trim();

      try {
        const parsed = JSON.parse(rawText) as T;
        return { data: parsed, repaired: false };
      } catch (parseError) {
        // Attempt 1 repair retry with explicit json instruction
        const repairPrompt = `The previous JSON response was malformed:
${rawText}
Parse error: ${String(parseError)}
Please fix it and return ONLY valid JSON matching this schema:
${schemaDescription}`;

        const repairRes = await fetch(`${this.host}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.model,
            prompt: repairPrompt,
            format: "json",
            stream: false,
            options: { temperature: 0 }
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (!repairRes.ok) throw new Error("Repair attempt failed");
        const repairBody = (await repairRes.json()) as { response: string };
        const repaired = JSON.parse(repairBody.response.trim()) as T;
        return { data: repaired, repaired: true };
      }
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
}
