def my_function():
  print("Hello from a function")

my_function()

def my_function(fname, lname):
  print(fname + " " + lname)

my_function("Emil", "Refsnes")

# If you do not know how many arguments that will be passed into your function, add a * before the parameter name in the function definition.
def my_function(*kids):
  print("The youngest child is " + kids[2])

my_function("Emil", "Tobias", "Linus")

# You can also send arguments with the key = value syntax.
# This way the order of the arguments does not matter.
def my_function(child3, child2, child1):
  print("The youngest child is " + child3)

my_function(child1 = "Emil", child2 = "Tobias", child3 = "Linus")

# The following example shows how to use a default parameter value.
# If we call the function without argument, it uses the default value:
def my_function(country = "Norway"):
  print("I am from " + country)

my_function("Sweden")
my_function("India")
my_function()
my_function("Brazil")

# Positional-Only Arguments
def my_function(x, /):
  print(x)

my_function(3)

# Recursion function
def tri_recursion(k):
  if k > 0:
    result = k + tri_recursion(k - 1)
    print(result)
  else:
    result = 0
  return result

print("\n\nRecursion Example Results")
tri_recursion(6)

# A lambda function is a small anonymous function.
# A lambda function can take any number of arguments, but can only have one expression

x = lambda a : a + 10
print(x(5))

x = lambda a, b : a * b
print(x(5, 6))
