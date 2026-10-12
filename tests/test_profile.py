from __future__ import annotations

import re
import unittest
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"


class ProfileRepositoryTests(unittest.TestCase):
    def test_required_files_exist(self) -> None:
        required = (
            "README.md",
            "LICENSE",
            "SECURITY.md",
            ".editorconfig",
            ".gitignore",
            ".github/workflows/ci.yml",
            ".github/dependabot.yml",
            "assets/banner.svg",
            "assets/banner-light.svg",
            "docs/social-preview.svg",
            "docs/social-preview.png",
        )
        for relative_path in required:
            with self.subTest(path=relative_path):
                self.assertTrue((ROOT / relative_path).is_file())

    def test_readme_local_assets_resolve(self) -> None:
        content = README.read_text(encoding="utf-8")
        references = re.findall(r'(?:src|srcset)="(\./[^"]+)"', content)
        self.assertEqual(
            references,
            [
                "./assets/banner.svg",
                "./assets/banner-light.svg",
                "./assets/banner-light.svg",
            ],
        )
        for reference in references:
            self.assertTrue((ROOT / reference[2:]).is_file())

    def test_text_block_is_at_most_forty_columns(self) -> None:
        inside_text_block = False
        found_text_block = False
        for line in README.read_text(encoding="utf-8").splitlines():
            if line == "```text":
                inside_text_block = True
                found_text_block = True
            elif line == "```" and inside_text_block:
                inside_text_block = False
            elif inside_text_block:
                self.assertLessEqual(len(line), 40, line)
        self.assertTrue(found_text_block)
        self.assertFalse(inside_text_block)

    def test_svg_files_are_safe_and_valid(self) -> None:
        expected_assets = {"banner.svg", "banner-light.svg"}
        self.assertEqual(
            {path.name for path in (ROOT / "assets").glob("*.svg")},
            expected_assets,
        )
        svg_files = [*(ROOT / "assets").glob("*.svg"), ROOT / "docs/social-preview.svg"]
        forbidden = (
            "<scr" + "ipt",
            "<foreign" + "Object",
            "href=\"http",
            "src=\"http",
            "data:" + "image",
        )
        for svg_file in svg_files:
            with self.subTest(path=svg_file):
                ElementTree.parse(svg_file)
                content = svg_file.read_text(encoding="utf-8")
                self.assertFalse(any(token in content for token in forbidden))

    def test_banner_animation_respects_reduced_motion(self) -> None:
        for name in ("banner.svg", "banner-light.svg"):
            content = (ROOT / "assets" / name).read_text(encoding="utf-8")
            self.assertIn("@keyframes blink", content)
            self.assertIn("prefers-reduced-motion: reduce", content)
            self.assertIn(".cursor { animation: none; }", content)

    def test_no_placeholder_text_is_committed(self) -> None:
        needles = (
            "SE" + "U_",
            "<FI" + "LL",
            "TO" + "DO",
            "FIX" + "ME",
            "lo" + "rem",
            "your" + "-handle",
        )
        text_suffixes = {".md", ".py", ".svg", ".yml", ".yaml", ".txt"}
        for path in ROOT.rglob("*"):
            if not path.is_file() or ".git" in path.parts:
                continue
            if path.suffix not in text_suffixes and path.name not in {"LICENSE", ".gitignore", ".editorconfig"}:
                continue
            content = path.read_text(encoding="utf-8")
            self.assertFalse(any(token.lower() in content.lower() for token in needles), path)


if __name__ == "__main__":
    unittest.main()
