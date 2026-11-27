// Pitch tracker for the tone trainer, compiled to WebAssembly (see native/build.sh).
// Freestanding: no libc, no allocator; the page writes samples straight into `buffer()`.

namespace {
constexpr int CAPACITY = 4096;
float samples[CAPACITY];
float last_level = 0;

inline float root(float x) { return __builtin_sqrtf(x); }
}  // namespace

extern "C" {

__attribute__((export_name("capacity"))) int capacity() { return CAPACITY; }
__attribute__((export_name("buffer"))) float* buffer() { return samples; }
__attribute__((export_name("level"))) float level() { return last_level; }

// Fundamental frequency of the first `n` samples in Hz, or 0 when the frame is silent or unvoiced.
// Normalised autocorrelation over 70–500 Hz; the window energies are kept as running sums, so each
// lag costs one pass instead of three, and the peak is refined between lags with a parabola.
__attribute__((export_name("detect_pitch"))) float detect_pitch(int n, float sample_rate) {
  if (n > CAPACITY) n = CAPACITY;
  if (n < 64 || sample_rate <= 0) return 0;
  float energy = 0;
  for (int i = 0; i < n; i++) energy += samples[i] * samples[i];
  last_level = root(energy / n);
  if (last_level < 0.012f) return 0;

  const int min_lag = static_cast<int>(sample_rate / 500);
  int max_lag = static_cast<int>(sample_rate / 70);
  if (max_lag > n / 2) max_lag = n / 2;
  if (min_lag < 1 || max_lag <= min_lag + 1) return 0;
  const int span = n - max_lag;

  float head = 0;  // energy of samples[0 .. span)
  for (int i = 0; i < span; i++) head += samples[i] * samples[i];
  float tail = 0;  // energy of samples[lag .. lag + span)
  for (int i = min_lag - 1; i < min_lag - 1 + span; i++) tail += samples[i] * samples[i];

  static float score[CAPACITY / 2 + 2];
  int best = -1;
  float best_score = 0;
  for (int lag = min_lag - 1; lag <= max_lag; lag++) {
    if (lag > min_lag - 1) tail += samples[lag + span - 1] * samples[lag + span - 1] - samples[lag - 1] * samples[lag - 1];
    float dot = 0;
    const float* a = samples;
    const float* b = samples + lag;
    for (int i = 0; i < span; i++) dot += a[i] * b[i];
    const float denom = root(head * tail);
    score[lag] = denom > 0 ? dot / denom : 0;
    if (lag >= min_lag && score[lag] > best_score) {
      best_score = score[lag];
      best = lag;
    }
  }
  if (best < 0 || best_score < 0.55f) return 0;

  float shift = 0;
  if (best > min_lag && best < max_lag) {
    const float l = score[best - 1], c = score[best], r = score[best + 1];
    const float curve = l - 2 * c + r;
    if (curve < 0) shift = 0.5f * (l - r) / curve;
  }
  return sample_rate / (best + shift);
}
}
