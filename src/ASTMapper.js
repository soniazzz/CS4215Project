function ASTmapper(jsonString) {
  // debugger
  const arr = JSON.parse(jsonString).Decls
  console.log('arr')
  console.log(arr)
  const temp = arr.slice(1, arr.length - 1) //extract import and main
  console.log('temp')
  console.log(temp)
  const lastNode = JSON.parse(jsonString).Decls[arr.length - 1]
  console.log('lastNode')
  console.log(lastNode)
  let mainStmts
  if (lastNode.NodeType === 'FuncDecl' && lastNode.Name.Name === 'main') {
    mainStmts = lastNode.Body.List
  }
  const jsonToBeOrganized = temp.concat(mainStmts)
  console.log('jsonToBeOrganized')
  console.log(jsonToBeOrganized)
  function mapNode(node) {
    if (!node) return null
    // debugger
    switch (node.NodeType) {
      case 'FuncDecl':
        console.log(node.Name.Name)
        console.log(node)
        return {
          tag: 'fun',
          sym: node.Name.Name,
          prms: node.Type.Params.List[0].Names.map(mapNode),
          body: mapNode(node.Body),
        }
      case 'BlockStmt':
        return {
          tag: 'blk',
          body: {
            tag: 'seq',
            stmts: node.List.map(mapNode),
          },
        }
      case 'ReturnStmt':
        return {
          tag: 'ret',
          expr: mapNode(node.Results[0]),
        }
      case 'CallExpr':
        return {
          tag: 'app',
          fun: { tag: 'nam', sym: node.Fun.Name },
          args: node.Args.map(mapNode),
        }
      case 'BinaryExpr':
        return {
          tag: 'binop',
          sym: node.Op,
          frst: mapNode(node.X),
          scnd: mapNode(node.Y),
        }
      case 'Ident':
        if (node.Name === 'true') {
          return { tag: 'lit', sym: true }
        }
        if (node.Name === 'false') {
          return { tag: 'lit', sym: false }
        }
        return { tag: 'nam', sym: node.Name }
      case 'BasicLit':
        return { tag: 'lit', val: JSON.parse(node.Value) }
      case 'IfStmt':
        return {
          tag: 'cond',
          pred: mapNode(node.Cond),
          cons: mapNode(node.Body),
          alt: mapNode(node.Else),
        }
      case 'ForStmt':
        return {
          tag: 'for',
          pred: mapNode(node.Cond),
          body: mapNode(node.Body),
        }

      case 'AssignStmt':
        if (node.Lhs.length === node.Rhs.length) {
          return {
            tag: 'assmt',
            sym: node.Lhs.map(mapNode),
            expr: node.Rhs.map(mapNode),
          }
        } else {
          alert(
            `mismatch: ${node.Lhs.length} variables but ${node.Rhs.length} value`
          )
        }
        return null

      case 'DeclStmt':
        if (node.Decl.Specs[0].Values === null) {
          //have not declared value
          //check type
          let t = node.Decl.Specs[0].Type.Name
          const numeric_type = [
            'uint8',
            'uint16',
            'uint32',
            'uint64',
            'int8',
            'int16',
            'int32',
            'int64',
            'float32',
            'float64',
            'complex64',
            'complex128',
            'byte',
            'rune',
            'uint',
            'int',
            'unitptr',
          ]
          const values = []
          if (numeric_type.includes(t)) {
            //numeric type
            for (let i = 0; i < node.Decl.Specs[0].Names.length; i++) {
              values.push({ tag: 'lit', val: 0 })
            }
            return {
              tag: 'assmt',
              sym: node.Decl.Specs[0].Names.map(mapNode),
              expr: values,
            }
          } else if (t === 'bool') {
            //boolean type
            for (let i = 0; i < node.Decl.Specs[0].Names.length; i++) {
              values.push({ tag: 'lit', val: false })
            }
            return {
              tag: 'assmt',
              sym: node.Decl.Specs[0].Names.map(mapNode),
              expr: values,
            }
          } else if (t === 'string') {
            //string type
            for (let i = 0; i < node.Decl.Specs[0].Names.length; i++) {
              values.push({ tag: 'lit', val: '' })
            }
            return {
              tag: 'assmt',
              sym: node.Decl.Specs[0].Names.map(mapNode),
              expr: values,
            }
          } else {
            alert('error type declaration')
          }
        } else {
          //Have declared variable value
          if (
            node.Decl.Specs[0].Names.length === node.Decl.Specs[0].Values.length
          ) {
            return {
              tag: 'assmt',
              sym: node.Decl.Specs[0].Names.map(mapNode),
              expr: node.Decl.Specs[0].Values.map(mapNode),
            }
          } else {
            alert(
              `mismatch: ${node.Decl.Specs[0].Names.length} variables but ${node.Decl.Specs[0].Values.length} value`
            )
          }
        }
        return null
      // Other node types go here
    }
  }

  const organized = {
    tag: 'blk',
    body: {
      tag: 'seq',
      stmts: jsonToBeOrganized.map(mapNode),
    },
  }
  console.log(organized)
  return JSON.stringify(organized)
}
export default ASTmapper
