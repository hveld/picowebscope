import json
fileName = "scope_data.json"
f = open(fileName)
data_out = json.load(f)

data = data_out["data"]
new_data = []
for i in range(len(data)):
    new_data.append(data[i]["y"])

new_data = json.dumps({"data": new_data})

f = open("small_" + fileName, "a")
f.write(new_data)
f.close()
