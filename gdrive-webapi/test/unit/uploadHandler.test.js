import {
    describe,
    test,
    expect,
    beforeEach,
    jest
} from '@jest/globals'

import Routes from '../../src/routes.js'
import UploadHandler from '../../src/uploadHandler.js'
import TestUtil from '../_util/testUtil.js'
import fs from 'fs'
import { resolve } from 'path'
import { pipeline } from 'stream/promises'
import { logger } from '../../src/logger.js'

describe('#UploadHandler test suite', () => {
    const ioObj = {
        to: (id) => ioObj,
        emit: (event, message) => {}
    }

    beforeEach(() => {
        jest.spyOn(logger, 'info')
            .mockImplementation()
    })

    describe('#registerEvents', () => {
        test('should call onFile and onFinish functions on Busboy instance', () => {
            const uploadHandler = new UploadHandler({
                io: ioObj,
                socketId: '01'
            })

            jest.spyOn(uploadHandler, uploadHandler.onFile.name)
                .mockResolvedValue()


            const header = {
                'content-type': 'multipart/form-data; boundary='
            }


            const onFinish = jest.fn()
            const busboyInstance = uploadHandler.registerEvents(header, onFinish)


            const fileStream = TestUtil.generateReadableStream(['chunk', 'of', 'data'])
            busboyInstance.emit('file', 'fieldName', fileStream, 'fileName.txt')

            busboyInstance.listeners('finish')[0].call()


            expect(uploadHandler.onFile).toHaveBeenCalled()
            expect(onFinish).toHaveBeenCalled()
        })

    })

    describe('#onFile', () => {
        test('given a stream file it should save it on disk', async () => {
            const chunks = ['hey', 'dude']
            const downloadsFolder = '/tmp'
            const handler = new UploadHandler({
                io: ioObj,
                socketId: '01',
                downloadsFolder
            })

            const onData = jest.fn()

            jest.spyOn(fs, fs.createWriteStream.name)
                .mockImplementation(() => TestUtil.generateWritableStream(onData))


            const onTransform = jest.fn()
            jest.spyOn(handler, handler.handlerFileBytes.name)
                .mockImplementation(() => TestUtil.generateTransformStream(onTransform))

            const params = {
                fieldName: 'video',
                file: TestUtil.generateReadableStream(chunks),
                fileName: 'mockFile.mov'
            }

            await handler.onFile(...Object.values(params))

            expect(onData.mock.calls.join()).toEqual(chunks.join())
            expect(onTransform.mock.calls.join()).toEqual(chunks.join())

            const expectedFilename = resolve(handler.downloadsFolder, params.fileName)
            expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFilename)
        })
    })

    describe('#handlerFileBytes', () => {
        test('should call emit function and it is a transform stream', async () => {
            jest.spyOn(ioObj, ioObj.to.name)
            jest.spyOn(ioObj, ioObj.emit.name)

            const handler = new UploadHandler({
                io: ioObj,
                socketId: '01'
            })

            jest.spyOn(handler, handler.canExecute.name)
                .mockReturnValueOnce(true)

            const messages = ['hello']
            const source = TestUtil.generateReadableStream(messages)
            const onWrite = jest.fn()
            const target = TestUtil.generateWritableStream(onWrite)

            await pipeline(
                source,
                handler.handlerFileBytes("filename.txt"),
                target
            )

            expect(ioObj.to).toHaveBeenCalledTimes(messages.length)
            expect(ioObj.emit).toHaveBeenCalledTimes(messages.length)

            // se o handlerFileBytes for um transform stream, nosso pipeline
            // vai continuar o processo, passando os dados para frente
            // e chamar nossa função no target a cada chunk
            expect(onWrite).toBeCalledTimes(messages.length)
            expect(onWrite.mock.calls.join()).toEqual(messages.join())
        })

        test('given message timerDelay as 2secs it should emit only two message during 2 seconds period', async () => {
            jest.spyOn(ioObj, ioObj.emit.name)
            
            const day = '2021-07-01 01:01'
            const messageTimeDelay = 2000



            //Date.now do this.lastMessageSent em handleBytes
            
            const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`)
            
            // -> hello chegou
            const onFistCanExecute = TestUtil.getTimeFromDate(`${day}:02`)
            const onSecondUpdateLastMessageSent = onFistCanExecute
            
            // -> segundo hello, está fora da janela de tempo
            const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`)
            
            // -> world
            const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`)

            TestUtil.mockDateNow(
                [
                    onFirstLastMessageSent,
                    onFistCanExecute,
                    onSecondUpdateLastMessageSent,
                    onSecondCanExecute,
                    onThirdCanExecute
                ]
            )
            
            
            
            const messages = ["hello", "hello", "world"]
            const fileName = 'filename.avi'
            const expectedMessageSent = 2


            const source = TestUtil.generateReadableStream(messages)
            const handler = new UploadHandler({
                messageTimeDelay,
                io: ioObj,
                socketId: '01'
            })

            await pipeline(
                source,
                handler.handlerFileBytes(fileName)
            )

            expect(ioObj.emit).toHaveBeenCalledTimes(expectedMessageSent)

            const [firstCallResult, secondCallResult] = ioObj.emit.mock.calls

            expect(firstCallResult).toEqual([handler.ON_UPLOAD_EVENT, {processedAlready: "hello".length, fileName}])
            expect(secondCallResult).toEqual([handler.ON_UPLOAD_EVENT, {processedAlready: messages.join("").length, fileName}])

        })
    })

    describe('#canExecute', () => {
        test('should return true when time is later than specified delay', () => {
            const timerDelay = 1000
            const uploadHandler = new UploadHandler({
                io: {},
                socketId: '',
                messageTimeDelay: timerDelay
            })

            const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:03')
            TestUtil.mockDateNow([tickNow])

            const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:00')

            const result = uploadHandler.canExecute(lastExecution)
            expect(result).toBeTruthy()
        })

        test('should return false when time isnt later than specified delay', () => {
            const timerDelay = 3000
            const uploadHandler = new UploadHandler({
                io: {},
                socketId: '',
                messageTimeDelay: timerDelay
            })

            const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:01')
            TestUtil.mockDateNow([tickNow])
            
            const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:00')

            const result = uploadHandler.canExecute(lastExecution)
            expect(result).toBeFalsy()
        })
    })
})