// Al Riyad Karim;
// Web Developer

// ! Object 

/*
  * object is key-value pair data structure which is used to store multiple value. It can be represented by single entity with value 
  *object can contain methods which called object methods
  * 
  * 
*/

// ? create an object

let BookStore = {
    name:"Old Book Seller",
    owner:"Mr. John Deo",
    total_book:20,
    currentBook:18,
    price:10,
    isOpen:true,
    since:2020,
    // * javaScript can also store object
    soldABook: function(){
        // * Inside js object method current object can be access using object name
        BookStore.currentBook--;
    },
    buyABook: function(){
        // * or using 'this' key word which ref to current object
        this.currentBook++;
    },
} 

// ? Access object field 

// * use object method using .methodName() operator
BookStore.buyABook();
BookStore.name;

// * access object field using . operator 
// console.log(BookStore.name); // Old Book Seller

// * another way to access object field is
// * We need this if somehow object name contain a "-"or " " then we cannot use objectName.objectField method
// console.log(BookStore["total_book"]); // 20 

// ? add a item into the object 

// * dot notation  
BookStore.location = 'Mirpur, Dhaka';

// * bracket notation 
BookStore['old Location'] = 'Rajshahi';

// * Object.assign() 
Object.assign(BookStore,{bestSelling:'JS Basic'});

// * Spread Syntax
BookStore = {...BookStore,latestAdd:"Python Basic"};

// * Define Property Directly

Object.defineProperty(BookStore, 'newArrival',{
    value:"Golang Basic",
    writable: true,      //* Indicates whether the property can be changed or not
    enumerable: true,    //* Indicates whether the property will be iterated over by methods like for...in loop or Object.keys()
    configurable: true   //* Indicates whether the property can be deleted or its attributes can be changed
})


// ? remove an item from object 

// * using delete operator into two way
delete BookStore.owner
delete BookStore['since'];

// * using spread operator 
// * basically an object destruction. price  field from BookStore is assigning to price variable other fields are assign to newBookStore variable 
const {price, ...newBookStore} = BookStore
// console.log(newBookStore); 


// ? check a filed exists in a object or not

// * Using 'in' operator 
 if('name' in BookStore) {
    // console.log('name exists')
 }
// console.log('name' in BookStore) // true
// console.log('length' in BookStore) // false 

// * 'hasOwnProperty()' method 
if(BookStore.hasOwnProperty('name')){
    // console.log('name exists ')
}

// console.log(BookStore.hasOwnProperty('name')) // true 
// console.log(BookStore.hasOwnProperty('width')) // false 

// * using strict equality property 
BookStore.name!==undefined // true 
BookStore.width!==undefined // false 

// * Object.key().includes() property 
Object.keys(BookStore).includes('name') // true
Object.keys(BookStore).includes('gender') // false




// ? iterate over an object

// * using for--in loop 
 for(let item in BookStore){
    //* console.log(item, " => ",BookStore[item]) 
 }

//  * using Object.keys().forEach()
// * Object.key() method return an array with a list of object key's 
 Object.keys(BookStore).forEach( key => {
    // * console.log(key, ' => ',BookStore[key]) 
 })

//  * using Object.entries() 
// * Object.entries( ([key, value]) => {})  method returns an array of all property 
 Object.entries(BookStore).forEach( ([key,value]) => {
    // console.log(key, " => ", value)
 })

// * using 'Object.getOwnPropertyNames()' 
Object.getOwnPropertyNames(BookStore).forEach( key => {
    // console.log(key, "-> ", BookStore[key]);
})

// ? merge two object 
const BookStore2 = {
    newName: "new book",
    newPrice: 20,
    name:"new Shop"
}

// * if same property have in two object, first object property will be over right by second one

// * using spread syntax 
 let mergeBookShop = {...BookStore, ...BookStore2};
 
// * using 'Object.assign()' 
 mergeBookShop = Object.assign({},BookStore,BookStore2); 

// * using for...in loop
 mergeBookShop = {};

for(let key in BookStore){
    mergeBookShop[key] = BookStore[key];
}
for(let key in BookStore2){
    mergeBookShop[key] = BookStore2[key];
}

// console.log(mergeBookShop);

// ? find the common field in both two object 


console.log(BookStore);


