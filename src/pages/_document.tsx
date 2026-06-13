import { Head, Html, Main, NextScript } from "next/document";

/** Runs before React hydrates so refresh keeps the chosen theme without a flash. */
const themeBootScript = `
(function () {
  try {
    var path = window.location.pathname;
    if (path === "/") {
      document.documentElement.setAttribute("data-theme", "light");
      return;
    }
    var marketing = ["/pricing", "/about", "/team", "/features", "/blog", "/vs-jira", "/contact"];
    for (var i = 0; i < marketing.length; i++) {
      if (path === marketing[i] || path.indexOf(marketing[i] + "/") === 0) {
        document.documentElement.setAttribute("data-theme", "light");
        return;
      }
    }
    if (path.indexOf("/auth") === 0) {
      document.documentElement.setAttribute("data-theme", "light");
      return;
    }
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
