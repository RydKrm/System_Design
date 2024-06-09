# A set is a collection which is unordered, unchangeable*, and unindexed.

myset = {"apple", "banana", "cherry"}

#  Sets are unordered, so you cannot be sure in which order the items will appear.
# Set items can appear in a different order every time you use them, and cannot be referred to by index or key.
# Sets cannot have two items with the same value.
thisset = {"apple", "banana", "cherry", "apple"}

print(thisset)

# The values True and 1 are considered the same value in sets, and are treated as duplicates

thisset = {"apple", "banana", "cherry", True, 1, 2}

print(thisset)

# A set can contain different data types:
set1 = {"abc", 34, True, 40, "male"}
print(set1)

# You cannot access items in a set by referring to an index or a key.
# But you can loop through the set items using a for loop, or ask if a specified value is present in a set, by using the in keyword
thisset = {"apple", "banana", "cherry"}

for x in thisset:
  print(x)
  
print("banana" in thisset)
print("ball" not in thisset)  
# To add one item to a set use the add() method.
thisset.add("Ginger")
print("Added item ", thisset)

# To add items from another set into the current set, use the update() method

tropical = {"pineapple", "mango", "papaya"}

thisset.update(tropical)

print(thisset)

# To remove an item in a set, use the remove(), or the discard() method
thisset.remove("banana")

print(thisset)

# Remove a random item by using the pop() method
x = thisset.pop()

print(x)

# The del keyword will delete the set completely
# del thisset

# * Set Join
# There are several ways to join two or more sets in Python.
# The union() and update() methods joins all items from both sets.
# The intersection() method keeps ONLY the duplicates.
# The difference() method keeps the items from the first set that are not in the other set(s).
# The symmetric_difference() method keeps all items EXCEPT the duplicate



