# Loop over a string
# for x in "banana":
#   print(x)

print("Loop over a string ")
# this will print from 0 to 5
for x in range(6):
  print(x)  
  
# this will print 2 to 5 
for x in range(2, 6):
  print(x)  
  
# Increment the sequence with 3 (default is 1) 
for x in range(2, 30, 3):
  print(x)
  
# Loop with end message
for x in range(6):
  print(x)
else:
  print("Finally finished!")  
  
adj = ["red", "big", "tasty"]
fruits = ["apple", "banana", "cherry"]

for x in adj:
  for y in fruits:
    print(x, y)  