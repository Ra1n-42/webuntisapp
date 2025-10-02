
// Erstelle eine Funktion, um das aktuelle Jahr zu bekommen
const getCurrentYear = () => {
    return new Date().getFullYear();
};

// Deine GitHub-URL
const githubUrl = "https://github.com/Ra1n-42";
// Ersetze DEINE_GITHUB_PROFIL_URL durch deinen echten Link!

const Footer = () => {
    return (
        <footer
            className="my-6 p-3 rounded-3xl shadow-xl text-center text-sm border-t border-gray-200 bg-gray-50 text-gray-600"
        // Diese Tailwind-Klassen sorgen für:
        // p-6: Innenabstand (Padding)
        // text-center: Text zentriert
        // text-sm: Kleine Schriftgröße
        // border-t: Obere Linie
        // bg-gray-50: Leichter grauer Hintergrund
        >
            <div className="max-w-4xl mx-auto">
                {/* Copyright */}
                <p>
                    © {getCurrentYear()}. Alle Rechte vorbehalten.
                </p>

                {/* GitHub Link */}
                <p className="mt-2">
                    <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors font-medium ml-1"
                    >
                        Ra1n-42 GitHub
                    </a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;