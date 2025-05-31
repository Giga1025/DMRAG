"""
WHY

 The data for the rule book and the campaigns are in the ocr-pdf form, we need converted them into xml
 Now the code below is using those xml tree structures and parsing the data into jsonl files accordingly.


How:
 We want our jsonl structure to be in this form:
 eg:- {"section_hierarchy": ["Level Advancement", "Areas of the House"], "section_type": "narrative", "source_doc": "curse_of_strahd", "genre": "gothic_horror", "content": ["The following areas correspond to labels on the map of the house on page 216."], "tables": []}

 So the code below does that accordingly, while doing so we use regex to get the section_type,the we also manually enter the source_doc and genre for the document we are parsing
"""

import xml.etree.ElementTree as ET
import json
from pathlib import Path

def parse_and_export(xml_path: Path, output_dir: Path):
    tree = ET.parse(xml_path)
    root = tree.getroot()

    output_dir.mkdir(parents=True, exist_ok=True)

    paragraphs = []
    grouped = {}
    section_stack = []
    para_counter = 1
    last_para = None
    last_section = None

    # this part handles the H (header) tags and P (paragraph) tags
    for elem in root.iter():
        tag = elem.tag.upper()

        if tag.startswith("H") and tag[1:].isdigit():
            level = int(tag[1])
            text = elem.text.strip() if elem.text else ""
            if text:
                section_stack = section_stack[:level - 1]
                section_stack.append(text)

        elif tag == "P":
            text = elem.text.strip() if elem.text else ""
            if not text:
                continue

            section_key = tuple(section_stack)

            if last_para and not last_para["text"].strip().endswith((".", "!", "?")) and last_section == section_key:
                last_para["text"] += " " + text
                paragraphs[-1]["text"] = last_para["text"]
                grouped[section_key]["content"][-1] = last_para["text"]
            else:
                last_para = {
                    "id": f"p_{para_counter:03}",
                    "section_hierarchy": list(section_key),
                    "text": text
                }
                paragraphs.append(last_para)
                para_counter += 1
                grouped.setdefault(section_key, {"content": [], "tables": []})
                grouped[section_key]["content"].append(text)

            last_section = section_key

    # this part handles the table tags
    section_stack = []
    for elem in root.iter():
        tag = elem.tag.upper()

        if tag.startswith("H") and tag[1:].isdigit():
            level = int(tag[1])
            text = elem.text.strip() if elem.text else ""
            if text:
                section_stack = section_stack[:level - 1]
                section_stack.append(text)

        elif tag == "TABLE":
            section_key = tuple(section_stack)
            rows = []
            for tr in elem.findall("TR"):
                cells = [td.text.strip() if td.text else "" for td in tr.findall("TD")]
                if cells:
                    rows.append(cells)
            if rows:
                grouped.setdefault(section_key, {"content": [], "tables": []})
                grouped[section_key]["tables"].append({"rows": rows})

    para_path = output_dir / "paragraphs.jsonl"
    with open(para_path, "w", encoding="utf-8") as f:
        for para in paragraphs:
            f.write(json.dumps(para, ensure_ascii=False) + "\n")
    print(f"Exported {len(paragraphs)} paragraphs to: {para_path}")

    def classify_section_type(content: list[str]) -> str:
        joined = " ".join(content).lower()

        if any(word in joined for word in ["battle", "ambush", "fight", "encounter", "combat", "initiative"]):
            return "combat"
        elif any(word in joined for word in ["village", "kingdom", "temple", "city", "tavern", "cave", "dungeon"]):
            return "location"
        elif any(word in joined for word in ["npc", "villain", "merchant", "priest", "creature", "lord"]):
            return "character"
        elif any(word in joined for word in ["mission", "quest", "objective", "goal", "task"]):
            return "objective"
        elif any(word in joined for word in ["dialogue", "conversation", "speaks", "says", "quote"]):
            return "dialogue"
        elif any(word in joined for word in ["trap", "secret", "hidden", "puzzle", "lock", "riddle"]):
            return "puzzle"
        elif "example" in joined or "e.g." in joined:
            return "example"
        elif len(content) == 1 and len(content[0].split()) < 6:
            return "label"
        else:
            return "narrative"

    grouped_path = output_dir / "grouped_sections.jsonl"
    with open(grouped_path, "w", encoding="utf-8") as f:
        for section_key, data in grouped.items():
            content = data.get("content", [])
            tables = data.get("tables", [])
            json.dump({
                "section_hierarchy": list(section_key),
                "section_type": classify_section_type(content),
                "source_doc": "curse_of_strahd",
                "genre": "gothic_horror",
                "content": content,
                "tables": tables
            }, f, ensure_ascii=False)
            f.write("\n")
    print(f"Exported grouped sections (with tables) to: {grouped_path}")

if __name__ == "__main__":
    output_folder = Path("jsonl_files/curse_of_strahd")
    parse_and_export(
        "XML_files/curse_of_strahd.xml",
        output_folder
    )

# curse_of_strahd
# DDEX14_DuesfortheDead
# Elfhunt
# lost_mine_of_phandelver
# SRD_CC_v5.2 (rule book)
