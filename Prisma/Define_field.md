The properties of a model are called fields, which consist of:

1. A field name
2. A field type
3. Optional type modifiers
4. Optional attributes, including native database type attributes

There are two type of fields: 
1. Scaler Fields Type
2. Relations Fields Type

```javascript
   model Command{
    id Int @id @default(autoincrement())
   }
```