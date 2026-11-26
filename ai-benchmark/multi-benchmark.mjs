import OpenAI from "openai";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

const envFile = new URL(".env", import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);

// Tambahkan provider lain yang mendukung OpenAI Chat Completions di sini.
const providers = {
    cline: { key: "CLINE_API_KEY", baseURL: "https://api.cline.bot/api/v1", headers: { "X-Response-Format": "openai" } },
    openai: { key: "OPENAI_API_KEY", baseURL: "https://api.openai.com/v1" },
    openrouter: { key: "OPENROUTER_API_KEY", baseURL: "https://openrouter.ai/api/v1" },
    deepseek: { key: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com" },
    groq: { key: "GROQ_API_KEY", baseURL: "https://api.groq.com/openai/v1" },
    gemini: { key: "GEMINI_API_KEY", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" },
    custom: { key: "CUSTOM_API_KEY", baseURL: process.env.CUSTOM_BASE_URL },
};

const help = `Cara pakai:
  node multi-benchmark.mjs <provider> <model> [prompt] [--no-usage]

Provider: ${Object.keys(providers).join(", ")}
Contoh:
  node multi-benchmark.mjs cline deepseek/deepseek-v4.1-flash-1017
  node multi-benchmark.mjs openai gpt-4o-mini "Jelaskan gravitasi"
  node multi-benchmark.mjs groq openai/gpt-oss-120b

Masukkan API key provider di .env (misalnya OPENAI_API_KEY=...).
Untuk custom, atur CUSTOM_BASE_URL dan CUSTOM_API_KEY di .env.
Gunakan --no-usage jika provider tidak mendukung stream_options.include_usage.`;

async function main() {
    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h")) {
        console.log(help);
        return;
    }
    const noUsage = args.includes("--no-usage");
    const positional = args.filter((arg) => arg !== "--no-usage");
    const [name, model, prompt = "Buatkan cerita fiksi pendek sepanjang 100 kata tentang petualangan di pegunungan."] = positional;
    if (!name || !model || positional.length > 3 || !Object.hasOwn(providers, name)) {
        throw new Error(`Provider atau model tidak valid.\n\n${help}`);
    }
    const config = providers[name];
    if (!config.baseURL) throw new Error("CUSTOM_BASE_URL belum diatur di .env.");
    if (!process.env[config.key]) throw new Error(`${config.key} belum diatur di .env atau environment.`);

    const client = new OpenAI({ apiKey: process.env[config.key], baseURL: config.baseURL, defaultHeaders: config.headers });
    console.log(`Memulai benchmark | Provider: ${name} | Model: ${model}\n\n--- Output Model ---`);
    const start = performance.now();
    let first = null;
    let fullText = "";
    let usage = null;
    const stream = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        ...(noUsage ? {} : { stream_options: { include_usage: true } }),
    });
    for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
            if (first === null) first = performance.now();
            fullText += content;
            process.stdout.write(content);
        }
        if (chunk.usage) usage = chunk.usage;
    }
    const end = performance.now();
    const total = (end - start) / 1000;
    const generation = first === null ? null : (end - first) / 1000;
    const tokens = usage?.completion_tokens;
    const cost = usage?.cost;
    const number = (value) => Number(value.toFixed(2));
    console.log("\n\n--- Hasil Benchmark ---");
    console.table({
        Provider: name,
        Model: model,
        "Jumlah Kata": fullText.trim().split(/\s+/).filter(Boolean).length,
        "Output Token": tokens ?? "-",
        "Biaya (USD)": typeof cost === "number" ? `$${cost.toFixed(6)}` : "-",
        "TTFT teks (detik)": first === null ? "-" : number((first - start) / 1000),
        "Total Waktu (detik)": number(total),
        "Generation TPS (perkiraan)": tokens > 1 && generation > 0 ? number((tokens - 1) / generation) : "-",
        "End-to-End TPS": tokens != null && total > 0 ? number(tokens / total) : "-",
        "TPOT (ms/token, perkiraan)": tokens > 1 && generation !== null ? number(generation * 1000 / (tokens - 1)) : "-",
    });
    console.log("TTFT dihitung hingga teks pertama; token output dapat mencakup reasoning dan biaya mungkin tidak disediakan provider.");
}

main().catch((err) => {
    console.error(`\nTerjadi kesalahan: ${err.message}`);
    process.exitCode = 1;
});
