tuple = (12,13,4)

# To create a tuple with only one item, you have to add a comma after the item, otherwise Python will not recognize it as a tuple.
oneItemTuple = (100,)
print(type(oneItemTuple))

# When we create a tuple, we normally assign values to it. This is called "packing" a tuple:
fruits = ("apple", "banana", "cherry")

# allowed to extract the values back into variables. This is called "unpacking"
(green, yellow, red) = fruits

print("fruits",green, yellow, red)

# If the number of variables is less than the number of values, you can add an * to the variable name and the values will be assigned to the variable as a list

fruits = ("apple", "banana", "cherry", "strawberry", "raspberry")

(green, yellow, *red) = fruits
print("unpacking tuple with * ")
print(green)
print(yellow)
print(red)

fruits = ("apple", "mango", "papaya", "pineapple", "cherry")

(green, *tropic, red) = fruits

print(green)
print(tropic)
print(red)