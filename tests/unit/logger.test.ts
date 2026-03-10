import { describe, it, expect, vi, beforeEach } from 'vitest'
import { log } from '@/lib/logger'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Log Levels', () => {
    it('should support info level', () => {
      expect(() => log.info('Test info message')).not.toThrow()
    })

    it('should support warn level', () => {
      expect(() => log.warn('Test warning')).not.toThrow()
    })

    it('should support error level', () => {
      expect(() => log.error('Test error')).not.toThrow()
    })

    it('should support debug level', () => {
      expect(() => log.debug('Test debug')).not.toThrow()
    })
  })

  describe('Context', () => {
    it('should log with additional context', () => {
      expect(() => log.info('Test message', { userId: '123', action: 'test' })).not.toThrow()
    })

    it('should log errors with error objects', () => {
      const error = new Error('Test error')
      expect(() => log.error('Error occurred', error)).not.toThrow()
    })
  })

  describe('Performance Timing', () => {
    it('should measure execution time', async () => {
      // log.time expects a function to execute
      await expect(
        log.time('test-operation', async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
        })
      ).resolves.not.toThrow()
    })
  })
})
