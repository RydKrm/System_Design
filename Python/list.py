# List in python , Array in other language
list = [2,3,4,1,4,5,123,53]
len = len(list)
print(len)

# list can contain different type of data
difList = [1,2,"ball", True]
print(difList);

print(type(difList))

# create list with initial value 

# List is a collection which is ordered and changeable. Allows duplicate members.
# Tuple is a collection which is ordered and unchangeable. Allows duplicate members.
# Set is a collection which is unordered, unchangeable*, and unindexed. No duplicate members.
# Dictionary is a collection which is ordered** and changeable. No duplicate members.


# Access list items
print(list[2])

# Negative indexing means start from the end
print(list[-1])

# You can specify a range of indexes by specifying where to start and where to end the range
print(list[2:5])

# By leaving out the start value, the range will start at the first item
print(list[:5])

# By leaving out the end value, the range will go on to the end of the list
print(list[2:])

# To determine if a specified item is present in a list use the in keyword
if 3 in list:
    print("item present")
else :
    print("Not present")    
    
# changing the list item
list[0] = 200
print(list)

# changing the in a range of item 
list[0:5] = [1,2] 
print(list)

# insert() method inserts an item at the specified index:
list.insert(2,1000)
print(list)

# append used in insert a item in the end of list 
list.append(2001)
print(list)

# concated two list
list2 = [3,1,4,5]
list.extend(list2)
print(list)

# remove item
if 2001 in list:
  list.remove(2001)
print(list)

# remove the last index
list.pop()
print(list)

# remove a specific item
list.pop(2)
print(list)

# The del keyword also removes the specified index:
del list[0]
print(list)

# The clear() method empties the list
# The list still remains, but it has no content
# list.clear()
# print(list)

for item in list:
    print(item)

# Use the range() and len() functions to create a suitable iterable.
# for i in range(len(list)-1):
#     print(list[i])

# thislist = ["apple", "banana", "cherry"]
# [print(x) for x in thislist]

oddList = [x for x in list if x%2]
print(oddList)


# Sort item 
list.sort()
print(list)

# sort descending order
list.sort(reverse=True)
print(list)

def sortFuc(n):
    return n-12;

list.sort(key = sortFuc)
print(list)

list.reverse()
print("reverse list ",list)

copyList = list.copy()
print("copy list",copyList);
# newList = list(copyList);
# print("new copy method ", newList)

# * Join two list

list3  = list + copyList;
print("Join list ", list3)

# count the number of element
let = list3.count(8)
print("Number of item ",len)