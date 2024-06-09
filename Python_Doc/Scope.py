# A variable is only available from inside the region it is created. This is called scope.

# A variable created inside a function belongs to the local scope of that function, and can only be used inside that function.

def myfunc():
  x = 300
  print(x)

myfunc()

# local scope 
# global scope 
# If you operate with the same variable name inside and outside of a function, Python will treat them as two separate variables, 
# one available in the global scope (outside the function) and one available in the local scope (inside the function

# If you need to create a global variable, but are stuck in the local scope, you can use the global keyword
x = 300

def myfunc():
  global x
  x = 200

myfunc()

print(x)

# The nonlocal keyword is used to work with variables inside nested functions.
# The nonlocal keyword makes the variable belong to the outer function.
def myfunc1():
  x = "Jane"
  def myfunc2():
    nonlocal x
    x = "hello"
  myfunc2()
  return x

print(myfunc1())

