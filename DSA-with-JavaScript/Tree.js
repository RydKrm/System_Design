/* 
  * create a tree node
  * Each node contain a value field and an array to store the child node address
  * also a node has addChild() method to add a child node 
*/

class TreeNode{
    // * for creating new Node
    constructor(value){
        this.value = value,
        this.child = []
    };

    // * new child add method
    addChild(treeNode){
        this.child.push(treeNode);
    }
}

// * Traversing all node of the tree
// * create a DFS algo for traversing 

const dfs = (node)=>{
    console.log(node);
    node.child.forEach(item =>{
        dfs(item);
    })
}

// * Depth First Search Traversing output 
const traversing = (node)=>{
    const stack = [];
    stack.push(node)
    while(stack.length>0){
    let top = stack.pop();
    console.log("Root => ", top.value);
    top.child.forEach(item => {
        console.log(item.value," ");
        stack.push(item);
    })
 }
}


const rootNode = new TreeNode('R');
const nodeA = new TreeNode('A');
const nodeB = new TreeNode('B');
const nodeC = new TreeNode('C');
const nodeD = new  TreeNode('D');
const nodeE = new TreeNode('E');
const nodeF = new TreeNode('F');



rootNode.addChild(nodeA);
rootNode.addChild(nodeB);
rootNode.addChild(nodeE);
nodeB.addChild(nodeC);
nodeB.addChild(nodeD);
nodeC.addChild(nodeF);

// dfs(rootNode)
traversing(rootNode)
// console.log(rootNode)