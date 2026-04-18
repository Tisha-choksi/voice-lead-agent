// PostCSS is the tool that processes your CSS files.
// Tailwind v4 requires this config to hook into Next.js's CSS pipeline.
//
// Without this file, Tailwind classes will NOT work — you'd see
// unstyled HTML even if you write className="bg-brand text-white".
//
// @tailwindcss/postcss is the official Tailwind v4 PostCSS plugin.
// It replaces the older `tailwindcss` plugin used in v3.

/** @type {import('postcss-load-config').Config} */
const config = {
    plugins: {
        "@tailwindcss/postcss": {},
    },
};

export default config;
