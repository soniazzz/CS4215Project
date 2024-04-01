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
import VirtualMachine from './VirtualMachine'

function App() {
  const [currentCode, setCurrentCode] = useState('')
  const [executedCode, setExectuedCode] = useState('')
  const [jsonAST, setJsonAST] = useState('')

  function handleEditorChange(value, event) {
    setCurrentCode(value)
  }

  function handleClear() {
    setCurrentCode('')
    setExectuedCode('')
    setJsonAST('')
  }

  function handleRunClick() {
    run(currentCode)
      .then((result) => {
        setExectuedCode(result)
      })
      .catch((error) => {
        setExectuedCode(`Error executing code: ${error}`)
      })
  }

  async function run(inputCodes) {
    try {
      const parsed_json_string = await parse(inputCodes)
      setJsonAST(ASTMapper(parsed_json_string))
      const result = VirtualMachine(jsonAST)
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
    if (jsonString == '' || jsonString == {}) {
      return ''
    } else {
      return JSON.parse(jsonString)
    }
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
                <Typography>{executedCode}</Typography>
              </Card>
            </Box>
          </Box>
        </Box>
      </Container>
    </div>
  )
}

export default App
