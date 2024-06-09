txt = f"The price is 49 dollars"
print(txt)

price = 59
time = 12
txt = f"The price is {price} dollars {time}"
print(txt)

txt = f"The price is {95:.2f} dollars"
print(txt)

# You can perform Python operations inside the placeholders
txt = f"The price is {20 * 59} dollars"
print(txt)

# You can perform if...else statements inside the placeholders:
price = 49
txt = f"It is very {'Expensive' if price>50 else 'Cheap'}"

print(txt)

# You can execute functions inside the placeholder:
fruit = "apples"
txt = f"I love {fruit.upper()}"
print(txt)

price = 59000
txt = f"The price is {price:,} dollars"
print(txt)

# Add a placeholder where you want to display the price:

price = 49
txt = "The price is {} dollars"
print(txt.format(price))


quantity = 3
itemno = 567
price = 49
myorder = "I want {} pieces of item number {} for {:.2f} dollars."
print(myorder.format(quantity, itemno, price))


myorder = "I have a {carname}, it is a {model}."
print(myorder.format(carname = "Ford", model = "Mustang"))