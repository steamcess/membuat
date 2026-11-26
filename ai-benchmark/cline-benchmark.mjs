import OpenAI from "openai";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

// Baca .env di folder benchmark, termasuk saat dijalankan dari folder lain.
const envFile = new URL(".env", import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);
if (!process.env.CLINE_API_KEY) {
    console.error("CLINE_API_KEY belum diatur di ai-benchmark/.env atau environment.");
    process.exit(1);
}
//cara jalankan ---> node cline-benchmark.mjs
const client = new OpenAI({
    apiKey: process.env.CLINE_API_KEY,
    baseURL: "https://api.cline.bot/api/v1",
    defaultHeaders: {
        "X-Response-Format": "openai", // Memastikan format respons selalu standar OpenAI
    },
});

// Gunakan format provider/nama-model
const MODEL = "deepseek/deepseek-v4.1-flash-1017";
const PROMPT =
    "Buatkan cerita fiksi pendek sepanjang 100 kata tentang petualangan di pegunungan.";

async function benchmarkCline(model, prompt) {
    console.log(`Memulai benchmark via Cline API | Model: ${model}\n`);
    console.log("--- Output Model ---");

    const tStart = performance.now();
    let tFirst = null;
    let fullText = "";
    let outputTokens = 0;
    let totalCost = null;

    const stream = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        const content = delta?.content;
        const reasoning = delta?.reasoning; // Khusus model dengan fitur thinking/reasoning

        if (content || reasoning) {
            if (tFirst === null) {
                tFirst = performance.now();
            }
            if (content) {
                fullText += content;
                process.stdout.write(content);
            }
        }

        // Ambil jumlah token & biaya asli dari chunk terakhir Cline
        if (chunk.usage) {
            if (chunk.usage.completion_tokens) {
                outputTokens = chunk.usage.completion_tokens;
            }
            if (chunk.usage.cost !== undefined) {
                totalCost = chunk.usage.cost;
            }
        }
    }

    const tEnd = performance.now();
    console.log("\n\n--- Hasil Benchmark ---");

    const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
    const ttftSec = tFirst ? (tFirst - tStart) / 1000 : 0;
    const genDurationSec = tFirst
        ? (tEnd - tFirst) / 1000
        : (tEnd - tStart) / 1000;
    const totalDurationSec = (tEnd - tStart) / 1000;

    const genTps =
        genDurationSec > 0 && outputTokens > 1
            ? (outputTokens - 1) / genDurationSec
            : 0;
    const e2eTps = totalDurationSec > 0 ? outputTokens / totalDurationSec : 0;
    const tpotMs =
        outputTokens > 1 ? (genDurationSec * 1000) / (outputTokens - 1) : 0;

    console.table({
        Model: model,
        "Jumlah Kata": wordCount,
        "Output Token": outputTokens,
        "Biaya (USD)": totalCost !== null ? `$${Number(totalCost).toFixed(6)}` : "-",
        "TTFT (detik)": Number(ttftSec.toFixed(3)),
        "Total Waktu (detik)": Number(totalDurationSec.toFixed(3)),
        "Generation TPS": Number(genTps.toFixed(2)),
        "End-to-End TPS": Number(e2eTps.toFixed(2)),
        "TPOT (ms/token)": Number(tpotMs.toFixed(2)),
    });
}

benchmarkCline(MODEL, PROMPT).catch((err) => {
    console.error("\nTerjadi kesalahan:", err.message);
    process.exitCode = 1;
});
