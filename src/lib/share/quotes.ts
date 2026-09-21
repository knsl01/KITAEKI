export const QUOTES = [
  "Kita tidak sedang mengejar kaya. Kita sedang membangun tenang, berdua.",
  "Sedikit demi sedikit, asal berdua, lama-lama jadi rumah.",
  "Uang bisa dicari lagi. Waktu berdua tidak.",
  "Menabung itu cara paling romantis untuk bilang: aku serius sama masa depan kita.",
  "Yang paling mahal bukan barangnya, tapi kebiasaan baik yang kita rawat bareng.",
  "Mimpi besar dimulai dari catatan kecil yang rutin.",
  "Transparan soal uang adalah bentuk sayang yang jarang dibicarakan.",
  "Hari ini nabung, besok tinggal syukur.",
  "Kalau berdua, angka di rekening jadi cerita, bukan beban.",
  "Pelan-pelan juga sampai, asal jalannya searah.",
  "Rencana yang ditulis berdua lebih susah dilupakan.",
  "Kaya itu bukan soal punya banyak, tapi cukup dan tidak cemas.",
  "Setiap rupiah yang kita sisihkan adalah janji kecil untuk kita di masa depan.",
  "Bukan siapa yang paling banyak menabung, tapi siapa yang paling konsisten.",
];

export function pickQuote(seed: number) {
  return QUOTES[Math.abs(Math.floor(seed)) % QUOTES.length];
}
