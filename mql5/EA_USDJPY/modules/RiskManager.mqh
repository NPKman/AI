#property strict

#ifndef __RISK_MANAGER_MQH__
#define __RISK_MANAGER_MQH__

#include "Utils.mqh"
#include "Logger.mqh"

//+------------------------------------------------------------------+
//| Risk manager maintains per-trade and daily loss limits            |
//+------------------------------------------------------------------+
class CRiskManager
  {
private:
   string m_symbol;
   CLogger *m_logger;
   double m_daily_loss_cap_pct;
   double m_risk_per_trade_pct;
   int    m_max_positions;
   int     m_current_day;
   double  m_start_of_day_equity;
   bool    m_daily_cap_triggered;

public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CRiskManager():m_symbol(""),m_logger(NULL),m_daily_loss_cap_pct(2.0),m_risk_per_trade_pct(0.5),m_max_positions(1),m_current_day(0),m_start_of_day_equity(0.0),m_daily_cap_triggered(false){}

   //+------------------------------------------------------------------+
   //| Configure manager                                                |
   //+------------------------------------------------------------------+
   void Configure(const string symbol,CLogger *logger,const double risk_pct,const double daily_cap,const int max_positions)
     {
      m_symbol=symbol;
      m_logger=logger;
      m_risk_per_trade_pct=risk_pct;
      m_daily_loss_cap_pct=daily_cap;
      m_max_positions=max_positions;
      m_current_day=TimeDay(TimeCurrent());
      m_start_of_day_equity=AccountInfoDouble(ACCOUNT_EQUITY);
      m_daily_cap_triggered=false;
     }

   //+------------------------------------------------------------------+
   //| Reset daily counters on new day                                  |
   //+------------------------------------------------------------------+
   void UpdateDay()
     {
      datetime now=TimeCurrent();
      int day=TimeDay(now);
      if(day!=m_current_day)
        {
         m_current_day=day;
         m_start_of_day_equity=AccountInfoDouble(ACCOUNT_EQUITY);
         m_daily_cap_triggered=false;
         if(m_logger!=NULL)
            m_logger.Info("RiskManager","Reset daily loss cap");
        }
     }

   //+------------------------------------------------------------------+
   //| Evaluate daily loss cap                                          |
   //+------------------------------------------------------------------+
   bool IsDailyLossCapHit()
     {
      if(m_daily_cap_triggered)
         return(true);
      double equity=AccountInfoDouble(ACCOUNT_EQUITY);
      double decline_percent=((m_start_of_day_equity-equity)/m_start_of_day_equity)*100.0;
      if(decline_percent>=m_daily_loss_cap_pct)
        {
         m_daily_cap_triggered=true;
         if(m_logger!=NULL)
            m_logger.Warn("RiskManager","Daily loss cap reached",DoubleToString(decline_percent,2));
        }
      return(m_daily_cap_triggered);
     }

   //+------------------------------------------------------------------+
   //| Determine if current position count below maximum                |
   //+------------------------------------------------------------------+
   bool CanOpenPosition()
     {
      if(IsDailyLossCapHit())
         return(false);

      int total=PositionsTotal();
      int symbol_positions=0;
      for(int i=0;i<total;i++)
        {
         if(!PositionSelectByIndex(i))
            continue;
         if(PositionGetString(POSITION_SYMBOL)==m_symbol)
            symbol_positions++;
        }
      if(symbol_positions>=m_max_positions)
        {
         if(m_logger!=NULL)
            m_logger.Warn("RiskManager","Max positions limit reached",IntegerToString(symbol_positions));
         return(false);
        }
      return(true);
     }

   //+------------------------------------------------------------------+
   //| Calculate volume based on risk percentage and stop distance      |
   //+------------------------------------------------------------------+
   double CalculateVolume(const double stop_distance_points)
     {
      double pip_size=Utils::PipSize(m_symbol);
      if(pip_size<=0.0 || stop_distance_points<=0.0)
         return(0.0);

      double risk_amount=AccountInfoDouble(ACCOUNT_EQUITY)*(m_risk_per_trade_pct/100.0);
      double tick_value=SymbolInfoDouble(m_symbol,SYMBOL_TRADE_TICK_VALUE);
      double tick_size=SymbolInfoDouble(m_symbol,SYMBOL_TRADE_TICK_SIZE);

      if(tick_value<=0.0 || tick_size<=0.0)
         return(0.0);

      double per_lot_loss=(stop_distance_points/tick_size)*tick_value;
      if(per_lot_loss<=0.0)
         return(0.0);

      double volume=risk_amount/per_lot_loss;
      return(Utils::NormalizeVolume(m_symbol,volume));
     }

   //+------------------------------------------------------------------+
   //| Expose risk settings                                             |
   //+------------------------------------------------------------------+
   double RiskPerTradePct() const { return(m_risk_per_trade_pct); }
   double DailyLossCapPct() const { return(m_daily_loss_cap_pct); }
  };

#endif // __RISK_MANAGER_MQH__
