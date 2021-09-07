import {
    describe,
    test,
    expect,
    jest
} from '@jest/globals'
import fs from 'fs'
import FileHelper from '../../src/fileHelper.js'

import Routes from '../../src/routes.js'

describe('#FileHelper', () => {

    describe('#getFileStatus', () => {
        test('it should return files statuses in correct format', async () => {

            const statMock = {
                dev: 2066,
                mode: 33204,
                nlink: 1,
                uid: 1000,
                gid: 1000,
                rdev: 0,
                blksize: 4096,
                ino: 8130360,
                size: 39173,
                blocks: 80,
                atimeMs: 1630985242896.6433,
                mtimeMs: 1630985242822,
                ctimeMs: 1630985242820.6418,
                birthtimeMs: 1630985240320.5964,
                atime: '2021-09-07T03:27:22.897Z',
                mtime: '2021-09-07T03:27:22.822Z',
                ctime: '2021-09-07T03:27:22.821Z',
                birthtime: '2021-09-07T03:27:20.321Z'
            }

            const mockUser = 'lgpc'
            process.env.USER = mockUser
            const filename = 'file.png'

            jest.spyOn(fs.promises,fs.promises.readdir.name)
            .mockResolvedValue([filename])

            jest.spyOn(fs.promises,fs.promises.stat.name)
                .mockResolvedValue(statMock)

            const result = await FileHelper.getFilesStatus("/tmp")

            const expectedResult = [
                {
                    size: '39.2 kB',
                    lastModified: statMock.birthtime,
                    owner: mockUser,
                    file: filename

                }
            ]

            expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${filename}`)
            expect(result).toMatchObject(expectedResult)
        })
    })
})