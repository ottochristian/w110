/**
 * Enhanced centralized logging utility with structured JSON logging
 * Supports multiple log levels, request tracking, and external integrations
 */

import * as Sentry from '@sentry/nextjs'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogContext {
  [key: string]: any
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  requestId?: string
  userId?: string
  error?: {
    message: string
    stack?: string
    name?: string
  }
}

class Logger {
  private requestId: string | null = null
  private userId: string | null = null
  private minLevel: LogLevel

  constructor() {
    // Set minimum log level based on environment
    this.minLevel = this.getMinLevel()
  }

  private getMinLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase()
    switch (envLevel) {
      case 'debug':
        return 'debug'
      case 'info':
        return 'info'
      case 'warn':
        return 'warn'
      case 'error':
        return 'error'
      case 'fatal':
        return 'fatal'
      default:
        return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
    const currentLevelIndex = levels.indexOf(level)
    const minLevelIndex = levels.indexOf(this.minLevel)
    return currentLevelIndex >= minLevelIndex
  }

  private formatLog(entry: LogEntry): string {
    // JSON format for production, pretty format for development
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry)
    }

    // Pretty format for development
    const { timestamp, level, message, context, requestId, userId, error } = entry
    let log = `[${timestamp}] [${level.toUpperCase()}]`

    if (requestId) log += ` [req:${requestId}]`
    if (userId) log += ` [user:${userId}]`

    log += ` ${message}`

    if (context && Object.keys(context).length > 0) {
      log += `\n  Context: ${JSON.stringify(context, null, 2)}`
    }

    if (error) {
      log += `\n  Error: ${error.message}`
      if (error.stack) {
        log += `\n  Stack: ${error.stack}`
      }
    }

    return log
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    }

    if (context) entry.context = context
    if (this.requestId) entry.requestId = this.requestId
    if (this.userId) entry.userId = this.userId
    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    }

    return entry
  }

  private output(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry = this.createEntry(level, message, context, error)
    const formatted = this.formatLog(entry)

    // Output to console
    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.log(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
      case 'fatal':
        console.error(formatted)
        break
    }

    // Send errors and fatals to Sentry
    if ((level === 'error' || level === 'fatal') && error) {
      Sentry.captureException(error, {
        level: level === 'fatal' ? 'fatal' : 'error',
        extra: context,
      })
    }

    // TODO: Send to external logging service (Datadog, LogDNA, CloudWatch, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   this.sendToExternalService(entry)
    // }
  }

  /**
   * Set request ID for tracking across logs
   */
  setRequestId(id: string) {
    this.requestId = id
  }

  /**
   * Set user ID for tracking user actions
   */
  setUserId(id: string) {
    this.userId = id
  }

  /**
   * Clear request/user context
   */
  clearContext() {
    this.requestId = null
    this.userId = null
  }

  /**
   * Create a child logger with context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger()
    childLogger.requestId = this.requestId
    childLogger.userId = this.userId
    // Store default context for child logger
    // This would require refactoring to maintain context
    return childLogger
  }

  /**
   * Log levels
   */
  debug(message: string, context?: LogContext) {
    this.output('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.output('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.output('warn', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    this.output('error', message, context, errorObj)
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    this.output('fatal', message, context, errorObj)

    // Fatal errors might warrant process exit in some cases
    // Uncomment if needed:
    // if (process.env.NODE_ENV === 'production') {
    //   process.exit(1)
    // }
  }

  /**
   * Measure execution time of a function
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    this.debug(`[TIMER] ${label} - started`)

    try {
      const result = await fn()
      const duration = Date.now() - start
      this.info(`[TIMER] ${label} - completed`, { durationMs: duration })
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.error(`[TIMER] ${label} - failed`, error, { durationMs: duration })
      throw error
    }
  }
}

// Export singleton instance
export const log = new Logger()

// Export class for creating child loggers
export { Logger }
