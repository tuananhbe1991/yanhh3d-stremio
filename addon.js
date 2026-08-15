const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://yanhh3d.ee";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/138 Mobile Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8"
  }
});

const manifest = {
  id: "vn.yanhh3d.addon",
  version: "1.1.0",
  name: "YanHH3D",
  description: "YanHH3D catalog",
  resources: ["catalog", "meta", "stream"],
  types: ["series"],
  catalogs: [
    {
      type: "series",
      id: "yanhh3d",
      name: "YanHH3D",
      extra: [
        {
          name: "search",
          isRequired: false
        }
      ]
    }
  ]
};

const builder = new addonBuilder(manifest);

function absoluteUrl(url) {
  if (!url) return null;

  if (url.startsWith("//")) {
    return "https:" + url;
  }

  return new URL(url, BASE_URL).href;
}

function makeId(url) {
  return "yanhh3d:" + encodeURIComponent(url);
}

function getUrlFromId(id) {
  if (!id || !id.startsWith("yanhh3d:")) {
    return null;
  }

  try {
    return decodeURIComponent(id.substring(8));
  } catch {
    return null;
  }
}

/*
 * Lấy poster
 */
function getPoster($, element) {
  const img = $(element).find("img").first();

  if (!img.length) {
    return null;
  }

  return absoluteUrl(
    img.attr("data-src") ||
    img.attr("data-lazy-src") ||
    img.attr("src")
  );
}

/*
 * Kiểm tra link có phải trang phim hay không.
 */
function isMovieUrl(url) {
  if (!url) return false;

  if (!url.startsWith(BASE_URL)) {
    return false;
  }

  return (
    url.includes("/tu-tien/") ||
    url.includes("/anime/") ||
    url.includes("/phim/")
  );
}

/*
 * Lấy catalog từ trang chủ/search.
 */
function parseCatalog(html) {
  const $ = cheerio.load(html);

  const results = [];
  const seen = new Set();

  $("a[href]").each((_, element) => {
    const a = $(element);
    const href = absoluteUrl(a.attr("href"));

    if (!isMovieUrl(href)) {
      return;
    }

    const title =
      a.find("h1,h2,h3,h4,h5,h6").first().text().trim() ||
      a.text().replace(/\s+/g, " ").trim();

    if (!title || title.length < 2) {
      return;
    }

    /*
     * Bỏ các link tập.
     */
    if (/\/tap-\d+/i.test(href)) {
      return;
    }

    if (seen.has(href)) {
      return;
    }

    seen.add(href);

    results.push({
      id: makeId(href),
      type: "series",
      name: title,
      poster: getPoster($, element)
    });
  });

  return results;
}


/*
 * CATALOG
 */
builder.defineCatalogHandler(async ({ extra }) => {
  try {
    let url = "/";

    /*
     * Search.
     *
     * YanHH3D dùng ô tìm kiếm trên website.
     * Nếu website thay đổi URL search, phần này có thể
     * cần chỉnh lại.
     */
    if (extra && extra.search) {
      url = "/?s=" + encodeURIComponent(extra.search);
    }

    const response = await client.get(url);

    const metas = await (response.data);
async function getMoviePoster(url) {
  try {
    const response = await client.get(url);
    const $ = cheerio.load(response.data);

    const poster =
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      $("img").first().attr("src") ||
      $("img").first().attr("data-src");

    return absoluteUrl(poster);
  } catch (error) {
    console.error("POSTER ERROR:", url, error.message);
    return null;
  }
}


async function parseCatalog(html) {
  const $ = cheerio.load(html);

  const movies = [];
  const seen = new Set();

  $("a[href]").each((_, element) => {
    const a = $(element);
    const href = absoluteUrl(a.attr("href"));

    if (!isMovieUrl(href)) {
      return;
    }

    if (/\/tap-\d+/i.test(href)) {
      return;
    }

    const title =
      a.find("h1,h2,h3,h4,h5,h6").first().text().trim() ||
      a.text().replace(/\s+/g, " ").trim();

    if (!title || title.length < 2) {
      return;
    }

    if (seen.has(href)) {
      return;
    }

    seen.add(href);

    movies.push({
      id: makeId(href),
      type: "series",
      name: title,
      url: href
    });
  });

  /*
   * Lấy poster trực tiếp từ trang phim.
   * Chỉ lấy 40 phim đầu để Render Free không bị quá tải.
   */
  const limited = movies.slice(0, 40);

  const results = await Promise.all(
    limited.map(async movie => {
      const poster = await getMoviePoster(movie.url);

      return {
        id: movie.id,
        type: "series",
        name: movie.name,
        poster: poster || undefined
      };
    })
  );

  return results;
}
    return {
      metas: metas.slice(0, 100),
      cacheMaxAge: 300,
      staleRevalidate: 900
    };

  } catch (error) {
    console.error("CATALOG ERROR:", error.message);

    return {
      metas: []
    };
  }
});


/*
 * META + EPISODES
 */
builder.defineMetaHandler(async ({ id }) => {
  const movieUrl = getUrlFromId(id);

  if (!movieUrl) {
    return {
      meta: {
        id,
        type: "series",
        name: "YanHH3D"
      }
    };
  }

  try {
    const response = await client.get(movieUrl);
    const $ = cheerio.load(response.data);

    /*
     * Tên phim
     */
    let name =
      $("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content") ||
      $("title").text().trim();

    /*
     * Loại bỏ phần "Tập xx" nếu có
     */
    name = name
      .replace(/\s*Tập\s+\d+.*$/i, "")
      .trim();

    /*
     * Poster
     */
    const poster = absoluteUrl(
      $("meta[property='og:image']").attr("content") ||
      $("img").first().attr("src")
    );

    /*
     * Mô tả
     */
    const description =
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    /*
     * Tìm tất cả tập.
     */
    const videos = [];
    const seen = new Set();

    $("a[href]").each((_, element) => {
      const a = $(element);

      const text = a
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const href = absoluteUrl(a.attr("href"));

      if (!href || !text) {
        return;
      }

      /*
       * Chỉ lấy link có chữ "Tập".
       *
       * Hỗ trợ:
       * Tập 1
       * Tập 2
       * Tập 100
       * Tập 124-HTCK1
       * Tập 240.1
       */
      const match = text.match(
        /Tập\s+([0-9]+(?:[.-][0-9]+)?(?:-[A-Za-z0-9]+)?)/i
      );

      if (!match) {
        return;
      }

      const episodeLabel = match[1];

      /*
       * Chỉ nhận link trong YanHH3D.
       */
      if (!href.startsWith(BASE_URL)) {
        return;
      }

      if (seen.has(href)) {
        return;
      }

      seen.add(href);

      /*
       * Stremio cần số episode.
       *
       * Ví dụ:
       * 1       -> 1
       * 2       -> 2
       * 240.1   -> 240
       * 124-HT  -> 124
       */
      const numberMatch = episodeLabel.match(/^(\d+)/);

      if (!numberMatch) {
        return;
      }

      const episodeNumber = parseInt(
        numberMatch[1],
        10
      );

      videos.push({
        id: makeId(href),
        title: "Tập " + episodeLabel,
        season: 1,
        episode: episodeNumber
      });
    });

    /*
     * Sắp xếp tập tăng dần.
     */
    videos.sort((a, b) => {
      if (a.episode !== b.episode) {
        return a.episode - b.episode;
      }

      return a.title.localeCompare(b.title);
    });

    return {
      meta: {
        id,
        type: "series",
        name,
        poster,
        description,
        videos
      },

      cacheMaxAge: 600,
      staleRevalidate: 1800
    };

  } catch (error) {
    console.error("META ERROR:", error.message);

    return {
      meta: {
        id,
        type: "series",
        name: "YanHH3D"
      }
    };
  }
});


/*
 * STREAM
 *
 * Hiện để trống.
 *
 * Không tự động vượt DRM/captcha/token/hotlink protection.
 */
builder.defineStreamHandler(async () => {
  return {
    streams: []
  };
});


module.exports = builder.getInterface();
