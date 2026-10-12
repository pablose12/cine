// Função serverless do Vercel: devolve o pôster de um filme ou a foto de uma pessoa (TMDB).
// Usa a mesma variável de ambiente TMDB_KEY (chave v3) que a função frames.js.
// Uso: /api/oscar?k=movie&q=Rain%20Man&y=1988   ou   /api/oscar?k=person&q=Dustin%20Hoffman&d=Acting
const API = "https://api.themoviedb.org/3";
async function get(path, q, key) {
  const u = API + path + "?" + new URLSearchParams({ ...q, api_key: key });
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(u); if (r.ok) return await r.json(); } catch (e) {}
  }
  return null;
}
module.exports = async (req, res) => {
  const key = (process.env.TMDB_KEY || "").trim();
  const q = req.query || {};
  const k = q.k === "person" ? "person" : "movie";
  const name = String(q.q || "").trim().slice(0, 120);
  const y = parseInt(q.y || "0", 10) || 0;
  if (!key) { res.status(500).json({ erro: "TMDB_KEY não configurada" }); return; }
  if (!name) { res.status(400).json({ erro: "faltou q" }); return; }
  let p = null;
  if (k === "movie") {
    const tries = y ? [y, y + 1, y - 1, 0] : [0];
    for (const yy of tries) {
      const r = await get("/search/movie", yy ? { query: name, year: yy, language: "pt-BR" } : { query: name, language: "pt-BR" }, key);
      const m = ((r && r.results) || []).find((x) => x.poster_path);
      if (m) { p = m.poster_path; break; }
    }
  } else {
    const dep = String(q.d || "");
    const names = [name].concat(name.indexOf(" e ") > 0 ? [name.split(" e ")[0]] : []);
    for (const n of names) {
      const r = await get("/search/person", { query: n, language: "pt-BR" }, key);
      const rs = ((r && r.results) || []).filter((x) => x.profile_path);
      const m = rs.find((x) => !dep || x.known_for_department === dep) || rs[0];
      if (m) { p = m.profile_path; break; }
    }
  }
  res.setHeader("Cache-Control", p ? "public, s-maxage=2592000, stale-while-revalidate=86400" : "public, s-maxage=3600");
  res.status(200).json({ p });
};
