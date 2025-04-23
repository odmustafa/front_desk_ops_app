using System;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using Destructurama;
using Ethereal.Engineering.Configuration;
using NUnit.Framework;
using Serilog;
using Serilog.Core;
using Serilog.Events;

namespace Ethereal.Engineering
{
    /// <summary>
    /// Initialization and configuration of the primary logger, currently Serilog.
    /// </summary>
    public static class LoggingService
    {
        private static bool Initialized;
        private static readonly object SyncLock = new object();

        private static ConfigurationService? Configuration { get; set; }

        internal static LoggingLevelSwitch? SeqLoggingLevelSwitch;
        internal static LoggingLevelSwitch? ConsoleLoggingLevelSwitch;

        /// <summary>
        /// Controls the Seq logging level of the application. This is controlled by the Seq website, do not change manually.
        /// </summary>
        /// <remarks>
        /// Must initialize with Verbose. Otherwise levels lower than the specified default will be ignored until the
        /// level switch is updated by the API. The API will drop any not specified on it's end as acceptable, so this
        /// shouldn't cause any performance issues except possibly on application startup until it synchronizes with Seq.
        /// </remarks>
        internal static readonly LoggingLevelSwitch LoggingLevelSwitch = new LoggingLevelSwitch(LogEventLevel.Verbose);

        /// <summary>
        /// Returns true if any logging target supports the specified log level, or false if none do.
        /// </summary>
        /// <param name="level">Log level to determine Enabled status for.</param>
        [TestCase(LogEventLevel.Verbose, ExpectedResult = true)]
        public static bool IsEnabled(LogEventLevel level)
        {
            return level >= (SeqLoggingLevelSwitch?.MinimumLevel ?? LoggingLevelSwitch.MinimumLevel) ||
                   level >= (ConsoleLoggingLevelSwitch?.MinimumLevel ?? LoggingLevelSwitch.MinimumLevel) ||
                   level >= LoggingLevelSwitch.MinimumLevel;
        }

        /// <summary>
        /// Initialize Logging related configurations and handlers if not already initialized.
        /// </summary>
        public static void Initialize(ConfigurationService configuration, Func<LoggerConfiguration, LoggerConfiguration>? additionalLoggerConfigurations = null)
        {
            if (Initialized)
                return;

            // Don't lock thread unless we've confirmed we're not initialized first.
            lock (SyncLock)
                if (!Initialized)
                {
                    Configuration = configuration;

                    var loggerConfiguration = new LoggerConfiguration()
                        // Log levels will be controlled in sub-loggers, so parent
                        // logger needs to allow all log types to pass through to them.
                        .MinimumLevel.Verbose()
                        .ConfigureEnrichers()
                        .ConfigureSeqTarget()
                        .ConfigureConsoleTarget()
                        .Destructure.UsingAttributes();

                    if (additionalLoggerConfigurations is not null)
                        loggerConfiguration = additionalLoggerConfigurations(loggerConfiguration);

                    Log.Logger = loggerConfiguration.CreateLogger();

                    Initialized = true;

                    Log.Logger.ForContext(typeof(LoggingService)).Information("Logging Initialized for {Application} on {MachineName}", Configuration.Application?.Name ?? "<Unknown>", Environment.MachineName);
                }
        }

        /// <summary>
        /// Configures the various structured data to append to each log event.
        /// </summary>
        private static LoggerConfiguration ConfigureEnrichers(this LoggerConfiguration configuration)
        {
            return configuration
                .Enrich.WithAssemblyInformationalVersion()
                .Enrich.WithThreadName()
                .Enrich.WithThreadId()
                .Enrich.WithMachineName()
                .Enrich.WithEnvironmentName()
                .Enrich.WithEnvironmentUserName()
                .Enrich.WithProcessId()
                .Enrich.WithProcessName()
                .Enrich.WithMemoryUsage()
                .Enrich.WithProperty("Application", Configuration?.Application?.Name ?? "<Unknown>");
        }

        /// <summary>
        /// Configures a sub-logger targeting the Console with the minimum log level controlled by LogManager.LoggingLevelSwitch.
        /// </summary>
        private static LoggerConfiguration ConfigureConsoleTarget(this LoggerConfiguration configuration)
        {
            var defaultLevel = Configuration?.Logging.ConsoleLoggingLevel ?? LogEventLevel.Debug;
            ConsoleLoggingLevelSwitch = new LoggingLevelSwitch(defaultLevel);

            return configuration.WriteTo.Logger(logger => logger
                .MinimumLevel.ControlledBy(ConsoleLoggingLevelSwitch)
                .WriteTo.Console(outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}][{SourceContext}]: {Message}{NewLine}{Exception}"));
        }

        /// <summary>
        /// Configures a sub-logger targeting Seq with the minimum log level controlled by Seq.
        /// </summary>
        private static LoggerConfiguration ConfigureSeqTarget(this LoggerConfiguration configuration)
        {
            if (Configuration == null || string.IsNullOrEmpty(Configuration.Logging.SeqUrl))
                    return configuration;

            var defaultLevel = Configuration.Logging.SeqLoggingLevel ?? LogEventLevel.Debug;
            SeqLoggingLevelSwitch = new LoggingLevelSwitch(defaultLevel);

            return configuration.WriteTo.Logger(logger => logger
                .MinimumLevel.ControlledBy(SeqLoggingLevelSwitch)
                .WriteTo.Seq(Configuration.Logging.SeqUrl,
                            apiKey: Configuration.Logging.SeqKey,
                            controlLevelSwitch: LoggingLevelSwitch));
        }

        /// <summary>
        /// Gets a logger for the current class. Ensure this is set to a static field on the class.
        /// </summary>
        /// <returns>An instance of <see cref="T:Serilog.ILogger" /></returns>
        [MethodImpl(MethodImplOptions.NoInlining)]
        public static ILogger GetCurrentClassLogger()
        {
            var context = new StackFrame(1, false).GetMethod()?.DeclaringType;

            if (context is null)
            {
                Log.Warning($"{nameof(GetCurrentClassLogger)} failed to determine calling class");
                return Log.ForContext(typeof(LoggingService));
            }
            
            return Log.ForContext(context);
        }
    }
}
