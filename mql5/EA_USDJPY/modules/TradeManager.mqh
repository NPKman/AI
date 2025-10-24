#property strict

#ifndef __TRADE_MANAGER_MQH__
#define __TRADE_MANAGER_MQH__

#include <Trade\Trade.mqh>
#include "RiskManager.mqh"
#include "Utils.mqh"
#include "Logger.mqh"

//+------------------------------------------------------------------+
//| Trade manager handles execution and trailing logic                |
//+------------------------------------------------------------------+
class CTradeManager
  {
private:
   string   m_symbol;
   CTrade   m_trade;
   CRiskManager *m_risk;
   CLogger *m_logger;
   double   m_max_spread_pips;
   bool     m_one_trade_per_bar;
   datetime m_last_trade_bar_time;

public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CTradeManager():m_symbol(""),m_risk(NULL),m_logger(NULL),m_max_spread_pips(2.0),m_one_trade_per_bar(true),m_last_trade_bar_time(0){}

   //+------------------------------------------------------------------+
   //| Configure trade manager                                          |
   //+------------------------------------------------------------------+
   void Configure(const string symbol,CRiskManager *risk,CLogger *logger,const double max_spread_pips,const bool one_trade_per_bar)
     {
      m_symbol=symbol;
      m_risk=risk;
      m_logger=logger;
      m_max_spread_pips=max_spread_pips;
      m_one_trade_per_bar=one_trade_per_bar;
      m_trade.SetTypeFillingBySymbol(symbol);
      m_trade.SetExpertMagicNumber(0);
     }

   //+------------------------------------------------------------------+
   //| Determine if trading allowed considering spread and slippage     |
   //+------------------------------------------------------------------+
   bool IsTradableSpread()
     {
      double pip=Utils::PipSize(m_symbol);
      if(pip<=0.0)
         return(false);
      long spread_points=0;
      if(!SymbolInfoInteger(m_symbol,SYMBOL_SPREAD,spread_points))
         return(false);
      double spread_pips=(spread_points*SymbolInfoDouble(m_symbol,SYMBOL_POINT))/pip;
      if(spread_pips>m_max_spread_pips)
        {
         if(m_logger!=NULL)
            m_logger.Warn("TradeManager","Spread too high",DoubleToString(spread_pips,1));
         return(false);
        }
      return(true);
     }

   //+------------------------------------------------------------------+
   //| Submit order based on signal                                     |
   //+------------------------------------------------------------------+
   bool Execute(const TradeSignal &signal,const double sl_mult,const double trail_mult,const bool use_trailing,const ulong magic)
     {
      if(signal.direction==SIGNAL_NONE)
         return(false);

      if(!IsTradableSpread())
         return(false);

      if(m_risk==NULL || !m_risk->CanOpenPosition())
         return(false);

      datetime bar_time=iTime(m_symbol,_Period,0);
      if(m_one_trade_per_bar && m_last_trade_bar_time==bar_time)
        {
         if(m_logger!=NULL)
            m_logger.Warn("TradeManager","One-trade-per-bar active");
         return(false);
        }

      double market_price=(signal.direction==SIGNAL_LONG)?SymbolInfoDouble(m_symbol,SYMBOL_ASK):SymbolInfoDouble(m_symbol,SYMBOL_BID);
      if(market_price<=0.0)
        {
         if(m_logger!=NULL)
            m_logger.Error("TradeManager","Invalid market price");
         return(false);
        }

      double stop_distance=MathAbs(market_price-signal.stop_price);
      double point=SymbolInfoDouble(m_symbol,SYMBOL_POINT);
      if(point<=0.0)
         return(false);
      double stop_distance_points=stop_distance/point;
      double volume=m_risk->CalculateVolume(stop_distance_points);
      if(volume<=0.0)
        {
         if(m_logger!=NULL)
            m_logger.Error("TradeManager","Volume calculation failed");
         return(false);
        }

      double margin_required=0.0;
      ENUM_ORDER_TYPE order_type=(signal.direction==SIGNAL_LONG)?ORDER_TYPE_BUY:ORDER_TYPE_SELL;
      ResetLastError();
      if(!OrderCalcMargin(order_type,m_symbol,volume,market_price,margin_required))
        {
         if(m_logger!=NULL)
            m_logger.Error("TradeManager","OrderCalcMargin failed",IntegerToString((int)_LastError));
         return(false);
        }
      double margin_free=AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      if(margin_required>margin_free)
        {
         if(m_logger!=NULL)
            m_logger.Warn("TradeManager","Insufficient margin",DoubleToString(margin_required,2));
         return(false);
        }

      m_trade.SetExpertMagicNumber((int)magic);

      bool result=false;
      long digits=0;
      SymbolInfoInteger(m_symbol,SYMBOL_DIGITS,digits);
      double normalized_sl=NormalizeDouble(signal.stop_price,(int)digits);
      double normalized_tp=NormalizeDouble(signal.target_price,(int)digits);
      string comment=(signal.direction==SIGNAL_LONG)?"USDJPY Trend Long":"USDJPY Trend Short";

      if(signal.direction==SIGNAL_LONG)
         result=m_trade.Buy(volume,m_symbol,0.0,normalized_sl,normalized_tp,comment);
      else if(signal.direction==SIGNAL_SHORT)
         result=m_trade.Sell(volume,m_symbol,0.0,normalized_sl,normalized_tp,comment);

      long retcode=m_trade.ResultRetcode();
      if(!result)
        {
         if(m_logger!=NULL)
            m_logger.Error("TradeManager","Order send failed",IntegerToString((int)retcode));
         return(false);
        }

      if(retcode!=TRADE_RETCODE_DONE && retcode!=TRADE_RETCODE_DONE_PARTIAL)
        {
         if(m_logger!=NULL)
            m_logger.Error("TradeManager","Unexpected retcode",IntegerToString((int)retcode));
         return(false);
        }

      if(m_logger!=NULL)
         m_logger.Info("TradeManager","Order placed",DoubleToString(volume,2));

      m_last_trade_bar_time=bar_time;
      return(true);
     }

   //+------------------------------------------------------------------+
   //| Update trailing stop based on ATR                                |
   //+------------------------------------------------------------------+
   void UpdateTrailing(const double atr_value,const double trail_mult,const ulong magic)
     {
      if(atr_value<=0.0)
         return;

      double trail_distance=atr_value*trail_mult;
      for(int i=PositionsTotal()-1;i>=0;i--)
        {
         if(!PositionSelectByIndex(i))
            continue;
         ulong ticket=(ulong)PositionGetInteger(POSITION_TICKET);

         if(PositionGetInteger(POSITION_MAGIC)!= (long)magic)
            continue;

         if(PositionGetString(POSITION_SYMBOL)!=m_symbol)
            continue;

         ENUM_POSITION_TYPE type=(ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         double price_current=SymbolInfoDouble(m_symbol,SYMBOL_BID);
         if(type==POSITION_TYPE_BUY)
            price_current=SymbolInfoDouble(m_symbol,SYMBOL_BID);
         else if(type==POSITION_TYPE_SELL)
            price_current=SymbolInfoDouble(m_symbol,SYMBOL_ASK);

         double stop=PositionGetDouble(POSITION_SL);
         if(type==POSITION_TYPE_BUY)
           {
            double new_stop=price_current-trail_distance;
            if(new_stop>stop)
              {
               if(!m_trade.PositionModify(ticket,new_stop,PositionGetDouble(POSITION_TP)))
                 {
                  if(m_logger!=NULL)
                     m_logger.Warn("TradeManager","Failed to trail buy",IntegerToString((int)m_trade.ResultRetcode()));
                 }
              }
           }
         else if(type==POSITION_TYPE_SELL)
           {
            double new_stop=price_current+trail_distance;
            if(new_stop<stop || stop==0.0)
              {
               if(!m_trade.PositionModify(ticket,new_stop,PositionGetDouble(POSITION_TP)))
                 {
                  if(m_logger!=NULL)
                     m_logger.Warn("TradeManager","Failed to trail sell",IntegerToString((int)m_trade.ResultRetcode()));
                 }
              }
           }
        }
     }
  };

#endif // __TRADE_MANAGER_MQH__
