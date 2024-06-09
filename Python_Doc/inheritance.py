# Inheritance allows us to define a class that inherits all the methods and properties from another class.
# Parent class is the class being inherited from, also called base class.
# Child class is the class that inherits from another class, also called derived class.

import datetime

class Material:
    def __init__(self,height, width):
        self.height = height
        self.width = width
    
    def size(self):
        print("Total size of the object ", self.height*self.width)    

# Creating class 
# The child's __init__() function overrides the inheritance of the parent's __init__() function.
class Book(Material):
  def __init__(self,name,author,publishYear, publisher,totalPage,height,width ):
    super().__init__(height,width)
    self.name = name
    self.author = author
    self.publishYear = publishYear
    self.publisher = publisher
    self.totalPage = totalPage
    
  def totalPass(self) :
    print("This book is publish ",datetime.datetime.now()-self.publishYear)
    
  def description(self) :
    print(self.name ,"by ",self.author," is a nice book. which is publish in", self.publishYear, self.publisher, "publish this book with ",self.totalPage," number of pages")  
    print("This book height ",self.height,"and width ",self.width)
    
book1 = Book("Harry porter","JK Rolling", 1998, "Gold Mine ", 200,40,40)

print(book1.description())
print(book1.height) 



