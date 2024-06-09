# Dictionaries are used to store data values in key:value pairs.
# A dictionary is a collection which is ordered*, changeable and do not allow duplicate

car = {
  "brand": "Ford",
  "model": "Mustang",
  "year": 1964
}
print(car)
print(car.get("brand"))

# Access an item
model = car['model']
print('Model ', model)

# The keys() method will return a list of all the keys in the dictionary
keyList = car.keys()
print(keyList)

# The values() method will return a list of all the values in the dictionary.
valueList = car.values()
print(valueList)

for item in car.keys() :
    print(item)
     
# Adding new item into the dictionary
car['year'] = 1950
print("After added ", car)     

# Updating item in dictionary
car['year'] = 2020  

# To determine if a specified key is present in a dictionary use the in keyword
model = "model"
if model in car:
    print("Model Exits ")

# * remove the from dictionary
car.pop(model)
print("After remove ", car)

#  remove using del keyword
# del car["brand"]

# The clear() method empties the dictionary
# car.clear()

# * Looping through the dictionary
# When looping through a dictionary, the return value are the keys of the dictionary
for key in car:
    print(key)
    
# for print the value
for key in car:
    print(key,":", car[key]) 

# * copy a dictionary 
# a dictionary with the copy() method
# You cannot copy a dictionary simply by typing dict2 = dict1, because: dict2 will only be a reference to dict1,
# and changes made in dict1 will automatically also be made in dict2.
newCar = car.copy()
print("copy a dic ", newCar)

# Nested dictionary 
myfamily = {
  "child1" : {
    "name" : "Emil",
    "year" : 2004
  },
  "child2" : {
    "name" : "Tobias",
    "year" : 2007
  },
  "child3" : {
    "name" : "Linus",
    "year" : 2011
  }
}

print("child 1",myfamily["child1"]["name"])
