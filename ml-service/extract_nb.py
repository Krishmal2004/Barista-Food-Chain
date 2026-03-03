import json

with open("Barista_LSTM.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

code_cells = [c["source"] for c in nb["cells"] if c["cell_type"] == "code"]

with open("extracted_notebook.py", "w", encoding="utf-8") as f:
    for cell in code_cells:
        f.write("".join(cell))
        f.write("\n\n")
