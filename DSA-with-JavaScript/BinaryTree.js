/* 
  * create a Tree Node which contain tree field
  * value contain the node value
  * left pointer contain the left node address
  * right pointer contain the right node address
*/

class TreeNode{
    constructor(value){
        this.value = value;
        this.left = null;
        this.right = null;
    }

    // * add left node value 
    addLeftChild(node){
        this.left = node;
    }

    // * add Right Node value
    addRightChild(node){
        this.right = node;
    }

}

const rootNode = new TreeNode('R');
const nodeB = new TreeNode('B');
const nodeC = new TreeNode('C');
const nodeD = new TreeNode('D');
const nodeE = new TreeNode('E');
const nodeF = new TreeNode('F');
const nodeG = new TreeNode('G');
const nodeH = new TreeNode('H');
const nodeI = new TreeNode('I');
const nodeJ = new TreeNode('J');
const nodeK = new TreeNode('K');

rootNode.addRightChild(nodeB);
rootNode.addLeftChild(nodeC);
nodeB.addLeftChild(nodeD);
nodeD.addLeftChild(nodeE);
nodeB.addRightChild(nodeF);
nodeC.addLeftChild(nodeG);
nodeE.addRightChild(nodeH);
nodeE.addLeftChild(nodeI);
nodeH.addLeftChild(nodeJ);
nodeF.addLeftChild(nodeK);

function inOrderTraversal(node) {
  if (node !== null) {
    inOrderTraversal(node.left); 
    console.log(node.value); 
    inOrderTraversal(node.right);
  }
}

// * Binary tree DFS traversing 
const DFS = (node) =>{
    const stack = [];
    stack.push(node);
    
    while(stack.length>0){
        let top = stack.pop();
        console.log("Root => ",top.value);
    if(top.left){
         let left = top.left;
         console.log("left => ", left.value)
         stack.push(top.left);
    }
        if(top.right) {
            let right = top.right;
             console.log("right => ", right.value)
            stack.push(top.right);
        }
    }
}

// console.log(rootNode);
// inOrderTraversal(rootNode)
DFS(rootNode);

