function ASTmapper(jsonString) {
  const arr = JSON.parse(jsonString).Decls
  // const temp = arr.slice(1, arr.length - 1) //extract import and main
  let temp
  if (arr[0].NodeType == 'GenDecl' && arr[0].Tok == 'import') {
    temp = arr.slice(1, arr.length - 1)
  } else {
    temp = arr.slice(0, arr.length - 1)
  }
  const lastNode = JSON.parse(jsonString).Decls[arr.length - 1]
  let mainStmts
  if (lastNode.NodeType === 'FuncDecl' && lastNode.Name.Name === 'main') {
    mainStmts = lastNode.Body.List
  }
  const jsonToBeOrganized = temp.concat(mainStmts)
  console.log('jsonTobeOrganized')
  console.log(jsonToBeOrganized)
  function mapNode(node) {
    if (!node) return null
    switch (node.NodeType) {
      case 'FuncDecl':
        let prms = []
        for (let i = 0; i < node.Type.Params.List.length; i++) {
          for (let j = 0; j < node.Type.Params.List[i].Names.length; j++)
            prms.push(node.Type.Params.List[i].Names[j].Name)
        }
        return {
          tag: 'fun',
          sym: node.Name.Name,
          prms: prms,
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
      case 'SelectorExpr':
        if (node.X.Name == 'time') {
          return {
            tag: 'time',
            val: node.Sel.Name,
          }
        }
      case 'CallExpr':
        if (node.Fun.Name == 'make' && node.Args[0].NodeType === 'ChanType') {
          let buffer = 1
          if (node.Args.length > 1) {
            buffer = node.Args[1].Value
          }
          return {
            tag: 'makechannel',
          }
        }
        if (node.Fun.NodeType == 'SelectorExpr' && node.Fun.Sel.Name == 'Add') {
          console.log('add waitgroup')
          console.log(node)
          return {
            tag: 'addwait',
            sym: mapNode(node.Fun.X),
            val: mapNode(node.Args[0]),
          }
        }
        if (
          node.Fun.NodeType == 'SelectorExpr' &&
          node.Fun.Sel.Name == 'Wait'
        ) {
          console.log('wait')
          console.log(node)
          return {
            tag: 'wait',
            sym: mapNode(node.Fun.X),
          }
        }
        if (
          node.Fun.NodeType == 'SelectorExpr' &&
          node.Fun.Sel.Name == 'Println'
        ) {
          return {
            tag: 'display',
            content: node.Args.map(mapNode),
          }
        }
        if (
          node.Fun.NodeType == 'SelectorExpr' &&
          node.Fun.Sel.Name == 'Sleep'
        ) {
          // let params = node.Args.map(mapNode)
          console.log('sleep')
          console.log(node)
          return {
            tag: 'sleep',
            time: mapNode(node.Args[0]),
          }
        }
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
        //special parse error for boolean
        if (node.Name === 'true') {
          return { tag: 'lit', val: true }
        }
        if (node.Name === 'false') {
          return { tag: 'lit', val: false }
        }
        return { tag: 'nam', sym: node.Name }
      case 'BasicLit':
        return { tag: 'lit', val: JSON.parse(node.Value) }
      case 'IfStmt':
        console.log(node)
        if (node.Else == null) {
          //only if
          return {
            tag: 'cond',
            pred: mapNode(node.Cond),
            cons: {
              tag: 'seq',
              stmts: node.Body.List.map(mapNode),
            },
          }
        } else if (node.Else.NodeType == 'BlockStmt') {
          //if else
          console.log(node)
          return {
            tag: 'cond',
            pred: mapNode(node.Cond),
            cons: {
              tag: 'seq',
              stmts: node.Body.List.map(mapNode),
            },
            alt: {
              tag: 'seq',
              stmts: node.Else.List.map(mapNode),
            },
          }
        } else if (node.Else.NodeType == 'IfStmt') {
          //if-else if-else
          return {
            tag: 'cond',
            pred: mapNode(node.Cond),
            cons: {
              tag: 'seq',
              stmts: node.Body.List.map(mapNode),
            },
            alt: mapNode(node.Else),
          }
        }
      case 'ForStmt':
        return {
          tag: 'for',
          pred: mapNode(node.Cond),
          body: mapNode(node.Body),
        }

      case 'AssignStmt':
        if (node.Lhs.length === node.Rhs.length) {
          switch (node.Tok) {
            case '=':
              return {
                tag: 'assmt',
                sym: node.Lhs.map(mapNode),
                expr: node.Rhs.map(mapNode),
              }
            case ':=':
              return {
                tag: 'decl',
                sym: node.Lhs.map(mapNode),
                expr: node.Rhs.map(mapNode),
              }
            case '+=':
              return {
                tag: 'assmt',
                sym: node.Lhs.map(mapNode),
                expr: [
                  {
                    tag: 'binop',
                    sym: '+',
                    frst: node.Lhs.map(mapNode)[0],
                    scnd: node.Rhs.map(mapNode)[0],
                  },
                ],
              }
            case '-=':
              return {
                tag: 'assmt',
                sym: node.Lhs.map(mapNode),
                expr: [
                  {
                    tag: 'binop',
                    sym: '-',
                    frst: node.Lhs.map(mapNode)[0],
                    scnd: node.Rhs.map(mapNode)[0],
                  },
                ],
              }
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
          if (
            node.Decl.Specs[0].Type.NodeType === 'SelectorExpr' &&
            node.Decl.Specs[0].Type.Sel.Name === 'WaitGroup'
          ) {
            return {
              tag: 'waitgroupdecl',
              sym: node.Decl.Specs[0].Names[0].Name,
            }
          }
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
              tag: 'decl',
              sym: node.Decl.Specs[0].Names.map(mapNode),
              expr: values,
            }
          } else if (t === 'bool') {
            //boolean type
            for (let i = 0; i < node.Decl.Specs[0].Names.length; i++) {
              values.push({ tag: 'lit', val: false })
            }
            return {
              tag: 'decl',
              sym: node.Decl.Specs[0].Names.map(mapNode),
              expr: values,
            }
          } else if (t === 'string') {
            //string type
            for (let i = 0; i < node.Decl.Specs[0].Names.length; i++) {
              values.push({ tag: 'lit', val: '' })
            }
            return {
              tag: 'decl',
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
              tag: 'decl',
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
      case 'ExprStmt':
        return mapNode(node.X)
      case 'GoStmt':
        console.log(node)
        let registered_WaitGroup = null
        if (
          node.Call.NodeType == 'CallExpr' &&
          node.Call.Fun.Body != undefined
        ) {
          let prms = []
          const prmsDecl = node.Call.Fun.Type.Params.List
          console.log(prmsDecl)
          if (prmsDecl != null) {
            for (let i = 0; i < prmsDecl.length; i++) {
              console.log(prmsDecl[i])
              for (let j = 0; j < prmsDecl[i].Names.length; j++) {
                console.log(prmsDecl[i].Names[j])
                prms.push(prmsDecl[i].Names[j].Name)
              }
            }
          }
          console.log(node)
          let declStmt = {
            tag: 'fun',
            sym: 'gofun',
            prms: prms,
            body: mapNode(node.Call.Fun.Body),
          }
          let callStmt = {
            tag: 'app',
            fun: { tag: 'nam', sym: 'gofun' },
            args: node.Call.Args.map(mapNode),
          }
          return {
            tag: 'gostmt',
            callbody: {
              tag: 'blk',
              body: {
                tag: 'seq',
                stmts: [declStmt, callStmt],
              },
            },
          }
        }
        return {
          tag: 'gostmt',
          callbody: {
            tag: 'blk',
            body: {
              tag: 'seq',
              stmts: [mapNode(node.Call)],
            },
          },
        }
      case 'SendStmt':
        return {
          tag: 'send',
          chan: node.Chan.Name,
          val: mapNode(node.Value),
        }
      case 'DeferStmt':
        return { tag: 'deferStmt', sym: node.Call.Fun.X.Name }
      case 'UnaryExpr':
        if (node.Op == '&') {
          return mapNode(node.X)
        }
        if (node.Op == '<-') {
          return {
            tag: 'receive',
            chan: node.X.Name,
          }
        }
    }
  }

  const organized = {
    tag: 'blk',
    body: {
      tag: 'seq',
      stmts: jsonToBeOrganized.map(mapNode),
    },
  }
  return JSON.stringify(organized)
}
export default ASTmapper
