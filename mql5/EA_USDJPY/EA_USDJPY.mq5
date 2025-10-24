//+------------------------------------------------------------------+
//| Expert Advisor: EA_USDJPY                                         |
//| Purpose : Conservative auto-trading on USDJPY only                |
//| WARNING: ห้ามใช้จริงโดยไม่ทดสอบ Forward/Backtest อย่างละเอียด |
//+------------------------------------------------------------------+
#property copyright ""
#property link      ""
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>
#include "modules/Utils.mqh"
#include "modules/Logger.mqh"
#include "modules/Regime.mqh"
#include "modules/Signals.mqh"
#include "modules/RiskManager.mqh"
#include "modules/TradeManager.mqh"
#include "modules/NewsFilter.mqh"

//--- input parameters
input group "=== System ==="
input int    InpMagic = 17001;
input bool   InpAllowLong = true;
input bool   InpAllowShort = true;
input bool   InpOneTradePerBar = true;

input group "=== Risk Management ==="
input double InpRiskPerTradePct = 0.5;
input double InpDailyLossPctCap = 2.0;
input int    InpMaxPositions = 1;

input group "=== Filters ==="
input bool   InpUseNewsFilter = false;
input int    InpNewsBufferMinBefore = 30;
input int    InpNewsBufferMinAfter  = 30;
input double InpMaxSpreadPips = 2.0;

input group "=== Regime & Signals ==="
input int    InpFastMA = 50;
input int    InpSlowMA = 200;
input int    InpADX    = 14;
input double InpADXThreshold = 18.0;
input int    InpRSI    = 14;
input int    InpBBPeriod = 20;
input double InpBBDev    = 2.0;

input group "=== Stops / Targets ==="
input double InpATRPeriod = 14;
input double InpSL_ATR_Mult = 2.0;
input double InpTP_RR       = 1.5;
input bool   InpUseATRTrailing = true;
input double InpTrail_ATR_Mult = 1.5;

input group "=== Time Window (Server Time) ==="
input bool   InpUseTimeWindow = true;
input int    InpStartHour = 6;
input int    InpEndHour   = 22;

input group "=== Strategy Mode ==="
enum ENUM_STRATEGY_MODE { MODE_AUTO=0, MODE_TREND_ONLY, MODE_MEAN_ONLY };
input ENUM_STRATEGY_MODE InpStrategyMode = MODE_AUTO;

//--- global objects
CLogger        g_logger;
CRiskManager   g_risk;
CTradeManager  g_trade_manager;
CSignalEngine  g_signals;
CRegimeDetector g_regime;
CNewsFilter    g_news;
Utils::CBarState g_bar_state;

//--- statistics structure
struct TradeStats
  {
   int total_trades;
   int wins;
   int losses;
   double total_rr;
   double max_drawdown;
   double peak_equity;

   TradeStats():total_trades(0),wins(0),losses(0),total_rr(0.0),max_drawdown(0.0),peak_equity(0.0){}
  };

TradeStats g_stats;

//+------------------------------------------------------------------+
//| Perform initialization checks                                     |
//+------------------------------------------------------------------+
bool SelfTest()
  {
   if(_Symbol!="USDJPY")
     {
      g_logger.Error("SelfTest","Symbol must be USDJPY");
      return(false);
     }

   if(!SymbolSelect(_Symbol,true))
     {
      g_logger.Error("SelfTest","Failed to select symbol");
      return(false);
     }

   double point=SymbolInfoDouble(_Symbol,SYMBOL_POINT);
   double pip=Utils::PipSize(_Symbol);
   if(point<=0.0 || pip<=0.0)
     {
      g_logger.Error("SelfTest","Invalid point/pip size");
      return(false);
     }

   double vol_min=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN);
   double vol_max=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX);
   double vol_step=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(vol_min<=0.0 || vol_max<=0.0 || vol_step<=0.0)
     {
      g_logger.Error("SelfTest","Volume specification invalid");
      return(false);
     }

   double margin=AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(margin<=0.0)
     {
      g_logger.Warn("SelfTest","Margin free is non-positive");
     }

   g_logger.Info("SelfTest","Initialization OK");
   return(true);
  }

//+------------------------------------------------------------------+
//| Initialize Expert                                                 |
//+------------------------------------------------------------------+
int OnInit()
  {
   g_logger.Init("EA_USDJPY_log.csv",true);
   g_logger.Info("Init","Starting EA_USDJPY");

   if(!SelfTest())
      return(INIT_FAILED);

   g_risk.Configure(_Symbol,&g_logger,InpRiskPerTradePct,InpDailyLossPctCap,InpMaxPositions);
   g_trade_manager.Configure(_Symbol,&g_risk,&g_logger,InpMaxSpreadPips,InpOneTradePerBar);
   if(!g_regime.Configure(_Symbol,_Period,InpFastMA,InpSlowMA,InpADX,InpADXThreshold))
     {
      g_logger.Error("Init","Failed to configure regime detector");
      return(INIT_FAILED);
     }
   if(!g_signals.Configure(_Symbol,_Period,InpRSI,InpBBPeriod,InpBBDev,InpADX,InpADXThreshold,InpFastMA,InpSlowMA,(int)InpATRPeriod))
     {
      g_logger.Error("Init","Failed to configure signal engine");
      return(INIT_FAILED);
     }
   g_news.Configure(InpUseNewsFilter,InpNewsBufferMinBefore,InpNewsBufferMinAfter,&g_logger);

   g_stats.peak_equity=AccountInfoDouble(ACCOUNT_EQUITY);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Deinitialization                                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   g_logger.Info("Deinit","Shutting down EA",IntegerToString(reason));
   g_logger.Shutdown();
  }

//+------------------------------------------------------------------+
//| Main tick handler                                                 |
//+------------------------------------------------------------------+
void OnTick()
  {
   if(Symbol()!="USDJPY")
      return;

   g_risk.UpdateDay();

   if(g_risk.IsDailyLossCapHit())
      return;

   if(!Utils::IsWithinTimeWindow(InpUseTimeWindow,InpStartHour,InpEndHour))
      return;

   if(InpUseNewsFilter && g_news.ShouldBlock(TimeCurrent()))
      return;

   TradeSignal signal;
   ENUM_MARKET_REGIME regime=REGIME_UNKNOWN;

   if(InpStrategyMode==MODE_TREND_ONLY)
      regime=REGIME_TREND;
   else if(InpStrategyMode==MODE_MEAN_ONLY)
      regime=REGIME_MEAN_REVERSION;
   else
      regime=g_regime.Detect();

   if(regime==REGIME_TREND)
      signal=g_signals.GenerateTrendSignal(InpAllowLong,InpAllowShort,InpSL_ATR_Mult,InpTP_RR,InpUseATRTrailing,InpTrail_ATR_Mult);
   else if(regime==REGIME_MEAN_REVERSION)
      signal=g_signals.GenerateMeanSignal(InpAllowLong,InpAllowShort,InpSL_ATR_Mult,InpTP_RR,InpUseATRTrailing,InpTrail_ATR_Mult,true);

   if(signal.direction!=SIGNAL_NONE)
     {
      if(g_trade_manager.Execute(signal,InpSL_ATR_Mult,InpTrail_ATR_Mult,InpUseATRTrailing,(ulong)InpMagic))
         g_logger.Info("Signal","Trade executed",EnumToString(regime));
     }

   if(InpUseATRTrailing)
     {
      double atr_for_trailing=g_signals.LatestATR();
      if(atr_for_trailing>0.0)
         g_trade_manager.UpdateTrailing(atr_for_trailing,InpTrail_ATR_Mult,(ulong)InpMagic);
     }
  }

//+------------------------------------------------------------------+
//| Handle trade transactions for stats                               |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,const MqlTradeRequest &request,const MqlTradeResult &result)
  {
   if(trans.type==TRADE_TRANSACTION_DEAL_ADD)
     {
      datetime from=TimeCurrent()-86400*5;
      datetime to=TimeCurrent();
      if(!HistorySelect(from,to))
         return;
      ulong deal_ticket=trans.deal;
      if(!HistoryDealSelect(deal_ticket))
         return;
      if(HistoryDealGetString(deal_ticket,DEAL_SYMBOL)!=_Symbol)
         return;
      double profit=HistoryDealGetDouble(deal_ticket,DEAL_PROFIT)+HistoryDealGetDouble(deal_ticket,DEAL_SWAP)+HistoryDealGetDouble(deal_ticket,DEAL_COMMISSION);
      double volume=HistoryDealGetDouble(deal_ticket,DEAL_VOLUME);
      if(volume>0.0)
        {
         g_stats.total_trades++;
         if(profit>0.0)
            g_stats.wins++;
         else if(profit<0.0)
            g_stats.losses++;
         double risk_amount=AccountInfoDouble(ACCOUNT_EQUITY)*(InpRiskPerTradePct/100.0);
         if(risk_amount>0.0)
            g_stats.total_rr+=profit/risk_amount;
        }
     }

   double equity=AccountInfoDouble(ACCOUNT_EQUITY);
   if(equity>g_stats.peak_equity)
      g_stats.peak_equity=equity;
   double drawdown=((g_stats.peak_equity-equity)/g_stats.peak_equity)*100.0;
   if(drawdown>g_stats.max_drawdown)
      g_stats.max_drawdown=drawdown;
  }

//+------------------------------------------------------------------+
//| Provide summary statistics                                        |
//+------------------------------------------------------------------+
double OnTester()
  {
   g_logger.Info("Tester","Trades",IntegerToString(g_stats.total_trades));
   g_logger.Info("Tester","Wins",IntegerToString(g_stats.wins));
   g_logger.Info("Tester","Losses",IntegerToString(g_stats.losses));
   if(g_stats.total_trades>0)
     {
      double avg_rr=g_stats.total_rr/g_stats.total_trades;
      g_logger.Info("Tester","Average R:R",DoubleToString(avg_rr,2));
     }
   g_logger.Info("Tester","Max Drawdown %",DoubleToString(g_stats.max_drawdown,2));
   return(g_stats.max_drawdown);
  }
