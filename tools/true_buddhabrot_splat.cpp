// Standard z <- z^2 + c Buddhabrot escape paths -> standard 3DGS PLY.
// XY is the rotated z-plane. Z is normalized orbit time in a thin slab
// so the front view is the 2D Buddhabrot, not a cubic Im(c) slice.

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

namespace {

constexpr double C_REAL_MIN = -2.12;
constexpr double C_REAL_MAX = 0.72;
constexpr double C_IMAG_MIN = -1.42;
constexpr double C_IMAG_MAX = 1.42;
constexpr double FIELD_MIN = -2.35;
constexpr double FIELD_MAX = 2.35;
constexpr double DEPTH_HALF = 0.42;
constexpr float SH_C0 = 0.28209479177387814f;

struct Complex {
  double real = 0.0;
  double imag = 0.0;
};

struct Point3 {
  double x;
  double y;
  double z;
};

struct Options {
  uint64_t samples = 16'000'000;
  uint32_t iterations = 4'096;
  uint32_t resolution = 896;
  uint32_t min_escape = 8;
  uint32_t max_splats = 1'000'000;
  uint32_t threads = std::max(1u, std::thread::hardware_concurrency());
  std::filesystem::path output = "outputs/true-buddhabrot/splat.ply";
};

struct VoxelCount {
  uint32_t voxel;
  uint32_t count;
};

struct Candidate {
  uint32_t voxel;
  float red;
  float green;
  float blue;
  float density;
  double selection_key;
};

uint64_t splitmix64(uint64_t value) {
  value += 0x9e3779b97f4a7c15ULL;
  value = (value ^ (value >> 30)) * 0xbf58476d1ce4e5b9ULL;
  value = (value ^ (value >> 27)) * 0x94d049bb133111ebULL;
  return value ^ (value >> 31);
}

double random01(uint64_t sample, uint64_t lane) {
  const uint64_t bits = splitmix64(sample * 2 + lane + 0x627564646861ULL);
  return static_cast<double>(bits >> 11) * (1.0 / 9007199254740992.0);
}

Complex iterate(const Complex& z, const Complex& c) {
  return {
      z.real * z.real - z.imag * z.imag + c.real,
      2.0 * z.real * z.imag + c.imag,
  };
}

double norm_squared(const Complex& value) {
  return value.real * value.real + value.imag * value.imag;
}

bool is_known_interior(const Complex& c) {
  const double bulb = (c.real + 1.0) * (c.real + 1.0) + c.imag * c.imag;
  const double q = (c.real - 0.25) * (c.real - 0.25) + c.imag * c.imag;
  return bulb <= 0.0625 || q * (q + c.real - 0.25) <= 0.25 * c.imag * c.imag;
}

uint32_t escape_time(const Complex& c, uint32_t max_iterations) {
  if (is_known_interior(c)) return 0;
  Complex z;
  Complex checkpoint;
  uint32_t checkpoint_span = 32;
  uint32_t since_checkpoint = 0;
  for (uint32_t step = 0; step < max_iterations; ++step) {
    z = iterate(z, c);
    if (norm_squared(z) > 4.0) return step + 1;
    ++since_checkpoint;
    const Complex delta{z.real - checkpoint.real, z.imag - checkpoint.imag};
    if (since_checkpoint > 8 && norm_squared(delta) < 1e-28) return 0;
    if (since_checkpoint >= checkpoint_span) {
      checkpoint = z;
      since_checkpoint = 0;
      checkpoint_span = std::min(checkpoint_span * 2u, 1024u);
    }
  }
  return 0;
}

Point3 project_orbit(const Complex& z, uint32_t step, uint32_t escape) {
  const double t = (static_cast<double>(step) + 0.5) / std::max(escape, 1u) - 0.5;
  return {
      z.imag,
      -(z.real + 0.5),
      t * DEPTH_HALF,
  };
}

void add_orbit(std::vector<uint32_t>& hits, const Options& options,
               const Complex& c, uint32_t escape) {
  Complex z;
  const double scale = options.resolution / (FIELD_MAX - FIELD_MIN);
  const size_t plane = static_cast<size_t>(options.resolution) * options.resolution;
  for (uint32_t step = 0; step + 1 < escape; ++step) {
    z = iterate(z, c);
    if (step < 2) continue;
    const Point3 point = project_orbit(z, step, escape);
    if (point.x < FIELD_MIN || point.x >= FIELD_MAX ||
        point.y < FIELD_MIN || point.y >= FIELD_MAX ||
        point.z < FIELD_MIN || point.z >= FIELD_MAX) continue;
    const uint32_t x = static_cast<uint32_t>((point.x - FIELD_MIN) * scale);
    const uint32_t y = static_cast<uint32_t>((point.y - FIELD_MIN) * scale);
    const uint32_t z_index = static_cast<uint32_t>((point.z - FIELD_MIN) * scale);
    const size_t voxel = static_cast<size_t>(z_index) * plane +
                         static_cast<size_t>(y) * options.resolution + x;
    hits.push_back(static_cast<uint32_t>(voxel));
  }
}

double percentile_log(const std::vector<VoxelCount>& density, double quantile) {
  std::vector<float> values;
  values.reserve(density.size());
  for (const VoxelCount& voxel : density) {
    values.push_back(std::log1p(static_cast<float>(voxel.count)));
  }
  if (values.empty()) return 1.0;
  const size_t index = std::min(values.size() - 1,
      static_cast<size_t>(quantile * static_cast<double>(values.size() - 1)));
  std::nth_element(values.begin(), values.begin() + index, values.end());
  return std::max(1e-6f, values[index]);
}

float normalized_density(uint32_t count, double exposure) {
  const double value = std::min(1.0, std::log1p(static_cast<double>(count)) / exposure);
  return static_cast<float>(std::pow(value, 1.5));
}

void append_float(std::ofstream& output, float value) {
  output.write(reinterpret_cast<const char*>(&value), sizeof(value));
}

void write_ply(const Options& options, const std::vector<Candidate>& splats) {
  std::filesystem::create_directories(options.output.parent_path());
  std::ofstream output(options.output, std::ios::binary);
  if (!output) throw std::runtime_error("could not open output PLY");
  output << "ply\nformat binary_little_endian 1.0\n"
         << "comment Buddhabrot XYT volume: Im(z), -Re(z), normalized orbit time\n"
         << "element vertex " << splats.size() << "\n";
  const char* fields[] = {
      "x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2",
      "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"};
  for (const char* field : fields) output << "property float " << field << "\n";
  output << "end_header\n";

  const size_t plane = static_cast<size_t>(options.resolution) * options.resolution;
  const float sigma = static_cast<float>((FIELD_MAX - FIELD_MIN) / options.resolution * 0.22);
  const float log_sigma_xy = std::log(sigma);
  const float log_sigma_z = std::log(sigma * 0.28f);
  for (const Candidate& splat : splats) {
    const uint32_t z_index = splat.voxel / plane;
    const uint32_t remainder = splat.voxel % plane;
    const uint32_t y_index = remainder / options.resolution;
    const uint32_t x_index = remainder % options.resolution;
    const auto coordinate = [&](uint32_t index) {
      return static_cast<float>(FIELD_MIN + (index + 0.5) / options.resolution *
                                             (FIELD_MAX - FIELD_MIN));
    };
    const float alpha = std::clamp(0.012f + 0.54f * std::pow(splat.density, 1.28f), 0.01f, 0.55f);
    const float opacity = std::log(alpha / (1.0f - alpha));
    const float values[] = {
        coordinate(x_index), coordinate(y_index), coordinate(z_index),
        0.0f, 0.0f, 0.0f,
        (splat.red - 0.5f) / SH_C0,
        (splat.green - 0.5f) / SH_C0,
        (splat.blue - 0.5f) / SH_C0,
        opacity, log_sigma_xy, log_sigma_xy, log_sigma_z,
        1.0f, 0.0f, 0.0f, 0.0f};
    for (float value : values) append_float(output, value);
  }
}

Options parse_options(int argc, char** argv) {
  Options options;
  for (int i = 1; i < argc; ++i) {
    const std::string argument = argv[i];
    auto next = [&]() -> std::string {
      if (++i >= argc) throw std::runtime_error("missing value after " + argument);
      return argv[i];
    };
    if (argument == "--samples") options.samples = std::stoull(next());
    else if (argument == "--iterations") options.iterations = std::stoul(next());
    else if (argument == "--resolution") options.resolution = std::stoul(next());
    else if (argument == "--min-escape") options.min_escape = std::stoul(next());
    else if (argument == "--max-splats") options.max_splats = std::stoul(next());
    else if (argument == "--threads") options.threads = std::max(1ul, std::stoul(next()));
    else if (argument == "--output") options.output = next();
    else throw std::runtime_error("unknown argument: " + argument);
  }
  const uint64_t voxels = static_cast<uint64_t>(options.resolution) *
                          options.resolution * options.resolution;
  if (options.resolution == 0 || voxels > UINT32_MAX) {
    throw std::runtime_error("resolution must fit a 32-bit sparse voxel index");
  }
  return options;
}

}  // namespace

int main(int argc, char** argv) {
  try {
    const Options options = parse_options(argc, argv);
    std::atomic<uint64_t> cursor{0};
    std::atomic<uint64_t> escaped{0};
    std::vector<std::vector<uint32_t>> local_hits(options.threads);
    std::vector<std::thread> workers;
    workers.reserve(options.threads);
    std::cerr << "sampling " << options.samples << " standard z^2+c parameters, "
              << options.iterations << " iterations into " << options.resolution << "^3 voxels\n";

    for (uint32_t thread = 0; thread < options.threads; ++thread) {
      local_hits[thread].reserve(options.samples / options.threads);
      workers.emplace_back([&, thread] {
        constexpr uint64_t CHUNK = 128;
        while (true) {
          const uint64_t begin = cursor.fetch_add(CHUNK);
          if (begin >= options.samples) break;
          const uint64_t end = std::min(options.samples, begin + CHUNK);
          for (uint64_t sample = begin; sample < end; ++sample) {
            const Complex c{
                C_REAL_MIN + random01(sample, 0) * (C_REAL_MAX - C_REAL_MIN),
                C_IMAG_MIN + random01(sample, 1) * (C_IMAG_MAX - C_IMAG_MIN),
            };
            const uint32_t escape = escape_time(c, options.iterations);
            if (escape >= options.min_escape) {
              ++escaped;
              add_orbit(local_hits[thread], options, c, escape);
            }
          }
        }
      });
    }
    for (auto& worker : workers) worker.join();

    size_t total_hits = 0;
    for (const auto& hits : local_hits) total_hits += hits.size();
    std::vector<uint32_t> hits;
    hits.reserve(total_hits);
    for (auto& thread_hits : local_hits) {
      hits.insert(hits.end(), thread_hits.begin(), thread_hits.end());
      std::vector<uint32_t>().swap(thread_hits);
    }
    std::vector<std::vector<uint32_t>>().swap(local_hits);
    std::sort(hits.begin(), hits.end());

    std::vector<VoxelCount> density;
    density.reserve(hits.size());
    for (size_t begin = 0; begin < hits.size();) {
      size_t end = begin + 1;
      while (end < hits.size() && hits[end] == hits[begin]) ++end;
      density.push_back({hits[begin], static_cast<uint32_t>(end - begin)});
      begin = end;
    }
    std::vector<uint32_t>().swap(hits);

    const double exposure = percentile_log(density, 0.998);
    const size_t plane = static_cast<size_t>(options.resolution) * options.resolution;
    std::vector<Candidate> candidates;
    candidates.reserve(density.size());
    for (const VoxelCount& voxel_density : density) {
      const float normalized = normalized_density(voxel_density.count, exposure);
      const uint32_t z_index = voxel_density.voxel / plane;
      const uint32_t remainder = voxel_density.voxel % plane;
      const uint32_t y_index = remainder / options.resolution;
      const float y = static_cast<float>(y_index) / std::max(1u, options.resolution - 1);
      const float depth = static_cast<float>(z_index) / std::max(1u, options.resolution - 1);
      const float warmth = std::clamp(0.28f * y + 0.72f * depth, 0.0f, 1.0f);
      const float luminance = 0.34f + 0.66f * std::sqrt(normalized);
      const float red = std::clamp(luminance * (0.38f + 0.55f * warmth), 0.0f, 1.0f);
      const float green = std::clamp(luminance * (0.72f + 0.20f * warmth), 0.0f, 1.0f);
      const float blue = std::clamp(luminance * (1.04f - 0.08f * warmth), 0.0f, 1.0f);
      const double weight = 0.0015 + 0.9985 * std::pow(normalized, 2.45f);
      const double random = std::max(1e-12, random01(voxel_density.voxel, 8));
      candidates.push_back({voxel_density.voxel, red, green, blue, normalized,
                            -std::log(random) / weight});
    }

    if (candidates.size() > options.max_splats) {
      std::nth_element(candidates.begin(), candidates.begin() + options.max_splats,
                       candidates.end(), [](const Candidate& left, const Candidate& right) {
                         return left.selection_key < right.selection_key;
                       });
      candidates.resize(options.max_splats);
    }
    std::sort(candidates.begin(), candidates.end(), [](const Candidate& left, const Candidate& right) {
      return left.voxel < right.voxel;
    });
    write_ply(options, candidates);
    std::cerr << "qualified paths " << escaped.load() << "; " << density.size()
              << " occupied voxels; wrote " << candidates.size() << " true Buddhabrot splats\n";
    return 0;
  } catch (const std::exception& error) {
    std::cerr << "error: " << error.what() << "\n";
    return 1;
  }
}
