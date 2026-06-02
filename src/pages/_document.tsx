import { Head, Html, Main, NextScript } from "next/document";

/** Runs before React hydrates so refresh keeps the chosen theme without a flash. */
const themeBootScript = `
(function () {
  try {
    var key = "tasker.theme";
    var theme = localStorage.getItem(key);
    if (theme === "indigo") theme = "light";
    var allowed = ["light", "dark", "greydark", "sunset"];
    if (allowed.indexOf(theme) === -1) theme = "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
