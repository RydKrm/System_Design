import datetime

class Person:
  def __init__(self, name, age):
    self.name = name
    self.age = age

  def __str__(self):
    return f"{self.name}({self.age})"

p1 = Person("John", 36)

print(p1) 

# Object method
class Person:
  def __init__(self, name, age):
    self.name = name
    self.age = age

  def myfunc(self):
    print("Hello my name is " + self.name)

p1 = Person("John", 36)
p1.myfunc() 

# Creating class 
class Book:
  def __init__(self,name,author,publishYear, publisher,totalPage ):
    self.name = name
    self.author = author
    self.publishYear = publishYear
    self.publisher = publisher
    self.totalPage = totalPage
    
  def totalPass(self) :
    print("This book is publish ",datetime.datetime.now()-self.publishYear)
    
  def description(self) :
    print(self.name ,"by ",self.author," is a nice book. which is publish in", self.publishYear, self.publisher, "publish this book with ",self.totalPage," number of pages")  
    
book1 = Book("Harry porter","JK Rolling", 1998, "Gold Mine ", 200)

print(book1.description())    