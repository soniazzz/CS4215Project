import React, { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import axios from 'axios'
import JsonView from '@uiw/react-json-view'
import ASTMapper from './ASTMapper'

function App() {
  const [currentCode, setCurrentCode] = useState('')
  const [executedCode, setExectuedCode] = useState('Please input and run the code on the left')
  const [jsonAST, setJsonAST] = useState('')

  function handleEditorChange(value) {
    setCurrentCode(value)
  }

  function handleClear() {
    setCurrentCode('')
    setExectuedCode('Please input the codes on the left')
    setJsonAST('')
  }

  function handleRunClick() {
    run(currentCode)
      .then((result) => {
        setExectuedCode(result)
      })
      .catch((error) => {
        alert(`Error executing code: ${error}`)
      })
  }

  async function run(inputCodes) {
    try {
      const parsed_json_string = await parse(inputCodes)
      const newJsonAST = ASTMapper(parsed_json_string)
      setJsonAST(newJsonAST) // Update the state for the next render
      const result = await sendASTandExecute(newJsonAST)
      return result
    } catch (error) {
      handleClear()
      if (inputCodes == '') {
        alert('Please input your codes')
      } else {
        console.error('Run error:', error)
        throw error // rethrow the error to be caught by the caller
      }
    }
  }

  function parse(value) {
    //return a string representing the json AST of the go codes
    return axios
      .post('http://localhost:8080/parse', { code: value })
      .then((response) => {
        if (response.data.error) {
          console.error('Error parsing code:', response.data.error)
          throw new Error(response.data.error)
        }
        return response.data.parsedCode
      })
      .catch((error) => {
        console.error('There was an error with the parse request:', error)
        throw error // rethrow the error to be caught by the caller
      })
  }

  const safeParseJSON = (jsonString) => {
    console.log(jsonString)
    if (jsonString == '' || jsonString == {}) {
      return ''
    } else {
      return JSON.parse(jsonString)
    }
  }
  //Actual Connection to backend VM, currently cut until VM is finished
  async function sendASTandExecute(jsonAST) {
    try {
      const response = await fetch('http://localhost:3001/run-vm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: jsonAST }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log(data.reply)
        return data.reply
      } else {
        console.error('Server error:', data.reply)
        return 'error'
      }
    } catch (error) {
      console.error('Network error:', error)
      return 'error'
    }
  }
  function formatExecutedCode(executedCode) {
    console.log(executedCode)
    if (typeof executedCode == 'object') {
      if (executedCode.length == 0) {
        return 'Nothing need to be printed out. Consider to use fmt.Println'
      }
      return executedCode.map((line, index) => (
        <React.Fragment key={index}>
          {line.join(' ')}
          {index < executedCode.length - 1 && <br />}
        </React.Fragment>
      ))
    }
    if (executedCode == []) {
      return 'Nothing need to be printed out. Consider to use fmt.Println'
    } else {
      console.log(executedCode)
    }
    return executedCode
  }
  //frontend ui
  return (
    <div className='App'>
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='h6' style={{ flexGrow: 1 }}>
            CS4215 Group Project by Sonia
          </Typography>
          <Button
            variant='contained'
            color='primary'
            onClick={handleRunClick}
            style={{ marginRight: 8 }} // Add some right margin to the first button
          >
            RUN CODES
          </Button>
          <Button variant='contained' color='primary' onClick={handleClear}>
            CLEAR CODES
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth='lg' style={{ marginTop: '24px', height: '550px' }}>
        <Box
          display='flex'
          justifyContent='space-between'
          sx={{ height: '100%' }}
        >
          <Box marginRight='12px' width='50%'>
            <Typography
              sx={{
                flexGrow: 1,
                textAlign: 'center',
                backgroundColor: 'primary.main',
                color: 'white',
              }}
            >
              Input Your Codes Here
            </Typography>

            <Card
              style={{
                height: '100%',
                padding: '16px',
                marginBottom: '12px',
                overflow: 'auto',
              }}
            >
              <CodeMirror
                height='95%'
                value={currentCode}
                onChange={handleEditorChange}
              />
            </Card>
          </Box>
          <Box width='50%' marginLeft='12px'>
            <Box height='70%'>
              <Typography
                sx={{
                  flexGrow: 1,
                  textAlign: 'center',
                  backgroundColor: 'primary.main',
                  color: 'white',
                }}
              >
                Parsed AST JSON
              </Typography>
              <Card
                style={{
                  height: '80%',
                  padding: '16px',
                  marginBottom: '12px',
                  overflow: 'auto',
                }}
              >
                <JsonView value={safeParseJSON(jsonAST)} />
              </Card>
            </Box>
            <Box height='30%'>
              <Typography
                sx={{
                  flexGrow: 1,
                  textAlign: 'center',
                  backgroundColor: 'primary.main',
                  color: 'white',
                }}
              >
                Output
              </Typography>
              <Card
                style={{
                  height: '100%',
                  padding: '16px',
                  marginBottom: '12px',
                  overflow: 'auto',
                }}
              >
                <Typography>{formatExecutedCode(executedCode)}</Typography>
              </Card>
            </Box>
          </Box>
        </Box>
      </Container>
    </div>
  )
}

export default App
