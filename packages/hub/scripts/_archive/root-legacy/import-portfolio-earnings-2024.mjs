import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SOCIAL_MEDIA_NOTE_PREFIX = "KIND:social_media";

const rawData = String.raw`MultiPolls	PayPal	Surveys	31/12/2024	-	-	-	7.00€
HeyCash	PayPal	Surveys	31/12/2024	-	-	-	2.00€
HeyCash	PayPal	Surveys	31/12/2024	-	-	-	1.00€
HeyCash	PayPal	Surveys	31/12/2024	-	-	-	2.00€
AttaPoll	PayPal	Surveys	31/12/2024	-	-	-	8.63€
Pret A Manger - PLN	Plutus	Cashback	31/12/2024	0.4038	19.65€	-	1.62€
Euro Disney - PLN	Plutus	Cashback	31/12/2024	0.3775	19.00€	-	1.51€
Euro Disney - PLN	Plutus	Cashback	31/12/2024	0.2466	12.00€	-	0.99€
McDonalds - PLN	Plutus	Cashback	31/12/2024	0.3947	20.00€	-	1.58€
Euro Disney - PLN	Plutus	Cashback	31/12/2024	0.2453	12.10€	-	0.98€
Euro Disney - PLN	Plutus	Cashback	30/12/2024	0.1530	7.60€	-	0.61€
RATP - PLN	Plutus	Cashback	30/12/2024	0.2110	10.55€	-	0.84€
RATP - PLN	Plutus	Cashback	30/12/2024	0.2010	10.05€	-	0.80€
RATP - PLN	Plutus	Cashback	30/12/2024	0.0866	4.30€	-	0.35€
Euro Disney - PLN	Plutus	Cashback	30/12/2024	0.6846	34.00€	-	2.74€
Disney - PLN	Plutus	Cashback	29/12/2024	0.6000	30.00€	-	2.40€
Franprix - PLN	Plutus	Cashback	29/12/2024	0.2646	13.14€	-	1.06€
Pingo Doce - PLN	Plutus	Cashback	29/12/2024	0.1044	5.22€	-	0.42€
Pingo Doce - PLN	Plutus	Cashback	29/12/2024	0.1141	5.78€	-	0.46€
Monisqui - PLN	Plutus	Cashback	28/12/2024	1.9931	98.99€	-	7.97€
Curve - Pingo Doce	Curve	Cashback	27/12/2024	-	-	£0.05	0.06€
Curve - Pingo Doce	Curve	Cashback	27/12/2024	-	-	£0.04	0.05€
MEO - PLN	Plutus	Cashback	26/12/2024	0.7883	40.99€	-	3.15€
Staples - PLN	Plutus	Cashback	26/12/2024	0.0401	2.02€	-	0.16€
Porto Editora - PLN	Plutus	Cashback	25/12/2024	0.4711	23.40€	-	1.88€
Barbearia São José - PLN	Plutus	Cashback	25/12/2024	0.3020	15.00€	-	1.21€
Curve - MEO	Curve	Cashback	24/12/2024	-	-	£0.34	0.40€
Uber - PLN	Plutus	Cashback	24/12/2024	0.0542	2.87€	-	0.22€
Pátio da Casqueira - PLN	Plutus	Cashback	23/12/2024	1.0435	56.00€	-	4.17€
Osteria 44 - PLN	Plutus	Cashback	23/12/2024	0.7434	39.15€	-	2.97€
Chico dos Filhos - PLN	Plutus	Cashback	21/12/2024	0.4630	25.00€	-	1.85€
Anda Seculo - PLN	Plutus	Cashback	20/12/2024	0.3439	20.29€	-	1.38€
Moinho Velho - PLN	Plutus	Cashback	20/12/2024	0.0305	1.80€	-	0.12€
Amazon - PLN	Plutus	Cashback	20/12/2024	2.5239	148.07€	-	10.10€
Pingo Doce - PLN	Plutus	Cashback	19/12/2024	0.1856	10.95€	-	0.74€
Leroy Merlin - PLN	Plutus	Cashback	18/12/2024	1.5079	93.99€	-	6.03€
Curve - Pingo Doce	Curve	Cashback	17/12/2024	-	-	£0.09	0.11€
Praxis - PLN	Plutus	Cashback	17/12/2024	0.4787	30.00€	-	1.91€
Santander	Santander	Cashback	15/12/2024	-	-	-	8.18€
Curve - Pingo Doce	Curve	Cashback	15/12/2024	-	-	£0.09	0.11€
Curve - Pingo Doce	Curve	Cashback	15/12/2024	-	-	£0.01	0.01€
Curve - Continente	Curve	Cashback	15/12/2024	-	-	£0.43	0.51€
Anda Seculo - PLN	Plutus	Cashback	16/12/2024	0.1267	8.15€	-	0.51€
Sabores Mondego - PLN	Plutus	Cashback	16/12/2024	0.1648	10.60€	-	0.66€
Continente - PLN	Plutus	Cashback	16/12/2024	0.7895	52.11€	-	3.16€
Pingo Doce - PLN	Plutus	Cashback	16/12/2024	0.0324	2.06€	-	0.130€
Plutus Perk (Pingo Doce)	Plutus	Cashback	16/12/2024	4.5026	8.60€	-	18.01€
Plutus Perk (Pingo Doce)	Plutus	Cashback	16/12/2024	0.7254	1.40€	-	2.90€
Farmacia Barros - PLN	Plutus	Cashback	15/12/2024	0.2092	13.95€	-	0.837€
Tomatino - PLN	Plutus	Cashback	15/12/2024	0.2606	16.85€	-	1.042€
BIRD - PLN	Plutus	Cashback	14/12/2024	0.0216	1.44€	-	0.086€
VIVA PORTO - PLN	Plutus	Cashback	14/12/2024	0.6300	42.00€	-	2.520€
Restaurante O Diplomata - PLN	Plutus	Cashback	14/12/2024	0.5460	36.40€	-	2.184€
MIIO Electric - PLN	Plutus	Cashback	14/12/2024	0.3000	20.00€	-	1.200€
MIIO Electric - PLN	Plutus	Cashback	14/12/2024	0.4200	28.00€	-	1.680€
MIIO Electric - PLN	Plutus	Cashback	14/12/2024	0.3000	20.00€	-	1.200€
Auchan - PLN	Plutus	Cashback	14/12/2024	0.0338	2.25€	-	0.135€
Pingo Doce Mealhada - PLN	Plutus	Cashback	14/12/2024	0.0040	0.27€	-	0.02€
Uber - PLN	Plutus	Cashback	14/12/2024	0.0409	2.71€	-	0.16€
Hoteis Bom Jesus - PLN	Plutus	Cashback	14/12/2024	0.0226	1.50€	-	0.09€
Sabor Sorrateiro - PLN	Plutus	Cashback	14/12/2024	0.0181	1.20€	-	0.07€
Ciccoria Avenida - PLN	Plutus	Cashback	14/12/2024	0.1711	11.35€	-	0.68€
Freedom Serviced - PLN	Plutus	Cashback	14/12/2024	0.1194	8.00€	-	0.48€
Uber - PLN	Plutus	Cashback	14/12/2024	0.0487	3.26€	-	0.19€
Auchan - PLN	Plutus	Cashback	14/12/2024	0.0009	0.06€	-	0.004€
Parfois - PLN	Plutus	Cashback	14/12/2024	0.2713	18.09€	-	1.09€
Continente - PLN	Plutus	Cashback	14/12/2024	3.2472	216.48€	-	12.99€
Plutus Perk (Continente)	Plutus	Cashback	14/12/2024	4.2500	8.50€	-	17.00€
CP - PLN	Plutus	Cashback	14/12/2024	0.7010	46.50€	-	2.80€
Brisa - PLN	Plutus	Cashback	14/12/2024	0.0407	2.70€	-	0.16€
CP - PLN	Plutus	Cashback	14/12/2024	0.2337	15.50€	-	0.93€
CP - PLN	Plutus	Cashback	14/12/2024	0.3211	21.30€	-	1.28€
Uber - PLN	Plutus	Cashback	14/12/2024	0.0660	4.38€	-	0.26€
A1 Vil - PLN	Plutus	Cashback	14/12/2024	0.0121	0.80€	-	0.05€
Metro Lisboa - PLN	Plutus	Cashback	14/12/2024	0.0269	1.80€	-	0.11€
CP - PLN	Plutus	Cashback	14/12/2024	0.6975	46.50€	-	2.79€
Hospital da Luz - PLN	Plutus	Cashback	14/12/2024	0.0525	3.50€	-	0.21€
CHRONOPOST DPD - PLN	Plutus	Cashback	14/12/2024	0.3211	21.41€	-	1.28€
MEO - PLN	Plutus	Cashback	14/12/2024	0.4048	26.99€	-	1.62€
Porto Editora - PLN	Plutus	Cashback	14/12/2024	0.0627	4.18€	-	0.25€
Plutus Perk (Continente)	Plutus	Cashback	14/12/2024	0.7463	1.50€	-	2.99€
As Tibias - PLN	Plutus	Cashback	14/12/2024	0.0256	1.70€	-	0.10€
As Tibias - PLN	Plutus	Cashback	14/12/2024	0.0256	1.70€	-	0.10€
TEMU - PLN	Plutus	Cashback	14/12/2024	0.2475	16.42€	-	0.99€
Plutus Perk (Curve)	Plutus	Cashback	11/12/2024	4.3624	9.99€	-	17.45€
Curve - MEO	Curve	Cashback	09/12/2024	-	-	£1.87	2.21€
Nicequest - Amazon	Vale	Surveys	06/12/2024	-	-	-	5€
Uber - PLN	Plutus	Cashback	05/12/2024	0.0785	5.94€	-	0.31€
Plutus Perk (Uber)	Plutus	Cashback	05/12/2024	3.2291	7.33€	-	12.92€
Booking	MBWay	Others	03/12/2024	-	-	-	5.00€
Plutus Perk (Pingo Doce) Bonus	Plutus	Cashback	03/12/2024	4.8000	10.00€	-	19.20€
Curve - MEO	Curve	Cashback	02/12/2024	-	-	£0.22	0.26€
Curve - Pingo Doce	Curve	Cashback	02/12/2024	-	-	£0.08	0.09€
Pingo Doce Mealhada - PLN	Plutus	Cashback	02/12/2024	0.1412	9.60€	-	0.56€
Plutus Perk (Uber)	Plutus	Cashback	01/12/2024	1.3153	2.67€	-	5.26€
Pepe Jeans - PLN	Plutus	Cashback	01/12/2024	0.9659	66.00€	-	3.86€
TikTok	MBWay	Others	01/12/2024	-	-	-	10.00€
AttaPoll	MBWay	Surveys	30/11/2024	-	-	-	5.47€
HeyCash	PayPal	Surveys	30/11/2024	-	-	-	10.00€
HeyCash	PayPal	Surveys	30/11/2024	-	-	-	5.00€
AttaPoll	MBWay	Surveys	30/11/2024	-	-	-	5.00€
TikTok	MBWay	Others	30/11/2024	-	-	-	10.00€
Anda Seculo - PLN	Plutus	Cashback	29/11/2024	0.0399	2.70€	-	0.16€
Farmacia Barros - PLN	Plutus	Cashback	29/11/2024	0.2782	18.55€	-	1.11€
DPD - PLN	Plutus	Cashback	29/11/2024	0.3501	23.69€	-	1.40€
Barbearia São José - PLN	Plutus	Cashback	29/11/2024	0.2090	14.00€	-	0.84€
CP - PLN	Plutus	Cashback	29/11/2024	0.1940	13.00€	-	0.78€
Leroy Merlin - PLN	Plutus	Cashback	29/11/2024	0.0018	0.12€	-	0.01€
Anda Seculo - PLN	Plutus	Cashback	29/11/2024	0.0340	2.30€	-	0.14€
Temu	LetyShops	Cashback	28/11/2024	-	-	-	2.33€
Booking	MBWay	Others	28/11/2024	-	-	-	6.00€
Pad Port Expo - PLN	Plutus	Cashback	28/11/2024	0.0466	3.15€	-	0.19€
Leroy Merlin - PLN	Plutus	Cashback	28/11/2024	0.1830	12.75€	-	0.73€
Blending Secrets - PLN	Plutus	Cashback	28/11/2024	0.0933	6.50€	-	0.37€
Metro Lisboa - PLN	Plutus	Cashback	28/11/2024	0.0255	1.80€	-	0.10€
Bolt - PLN	Plutus	Cashback	28/11/2024	0.0559	3.95€	-	0.22€
Metro Lisboa - PLN	Plutus	Cashback	28/11/2024	0.0255	1.80€	-	0.10€
Bolt - PLN	Plutus	Cashback	28/11/2024	0.0600	4.24€	-	0.24€
Metro Lisboa - PLN	Plutus	Cashback	28/11/2024	0.0255	1.80€	-	0.10€
Staples - PLN	Plutus	Cashback	28/11/2024	0.0018	0.13€	-	0.01€
AliExpress - PLN	Plutus	Cashback	28/11/2024	0.0515	3.64€	-	0.21€
Choupana Caffe - PLN	Plutus	Cashback	28/11/2024	0.0138	0.95€	-	0.06€
LXCOOKS - PLN	Plutus	Cashback	28/11/2024	0.1537	10.50€	-	0.61€
AUCHAN - PLN	Plutus	Cashback	28/11/2024	0.0017	0.12€	-	0.01€
Booking	MBWay	Others	27/11/2024	-	-	-	18.00€
Esdemarca.com - PLN	Plutus	Cashback	27/11/2024	0.9101	60.98€	-	3.64€
Dominos - PLN	Plutus	Cashback	27/11/2024	0.3285	21.90€	-	1.31€
FNAC - PLN	Plutus	Cashback	27/11/2024	0.0275	1.90€	-	0.11€
Anda Seculo - PLN	Plutus	Cashback	26/11/2024	0.1401	8.50€	-	0.56€
H3 - PLN	Plutus	Cashback	26/11/2024	0.3140	19.05€	-	1.26€
Springfield - PLN	Plutus	Cashback	26/11/2024	1.1228	26.00€	-	4.49€
MIIO Electric - PLN	Plutus	Cashback	25/11/2024	0.3279	20.00€	-	1.31€
LIDL - PLN	Plutus	Cashback	25/11/2024	0.0825	4.95€	-	0.33€
Plutus Perk (LIDL)	Plutus	Cashback	25/11/2024	5.5556	10.00€	-	22.22€
MIIO Electric - PLN	Plutus	Cashback	24/11/2024	0.8671	50.00€	-	3.47€
Ticketline - PLN	Plutus	Cashback	24/11/2024	0.5586	32.21€	-	2.23€
Rejuvemed - PLN	Plutus	Cashback	24/11/2024	0.4682	27.00€	-	1.87€
Continente - PLN	Plutus	Cashback	24/11/2024	0.1744	10.00€	-	0.70€
Tradeinn - PLN	Plutus	Cashback	24/11/2024	0.0000	74.98€	-	0.00€
IPBR Farmacias - PLN	Plutus	Cashback	23/11/2024	0.3065	20.73€	-	1.23€
Amazon - PLN	Plutus	Cashback	23/11/2024	0.3863	16.45€	-	1.55€
Dominos Pizza - PLN	Plutus	Cashback	23/11/2024	0.4515	24.23€	-	1.81€
Hospital da Luz - PLN	Plutus	Cashback	23/11/2024	0.4731	25.39€	-	1.89€
Hospital da Luz - PLN	Plutus	Cashback	23/11/2024	1.2112	65.00€	-	4.84€
Porto Arts Bar - PLN	Plutus	Cashback	23/11/2024	0.8516	45.70€	-	3.41€
Rest Canil Lisboa - PLN	Plutus	Cashback	23/11/2024	0.2888	15.50€	-	1.16€
MEO - PLN	Plutus	Cashback	23/11/2024	1.0992	58.99€	-	4.40€
Continente - PLN	Plutus	Cashback	23/11/2024	0.0557	2.99€	-	0.22€
Plutus Perk (Continente)	Plutus	Cashback	23/11/2024	6.2112	10.00€	-	24.84€
Curve - LIDL	Curve	Cashback	23/11/2024	-	-	£0.12	0.14€
Curve - Continente	Curve	Cashback	22/11/2024	-	-	£0.08	0.09€
Easy Jet - PLN	Plutus	Cashback	21/11/2024	6.2041	355.70€	-	24.82€
Paris Rooms - PLN	Plutus	Cashback	21/11/2024	12.2175	696.40€	-	48.87€
MEO - PLN	Plutus	Cashback	21/11/2024	0.7149	40.99€	-	2.86€
BOL - PLN	Plutus	Cashback	21/11/2024	0.8241	47.25€	-	3.30€
Booking - PLN	Plutus	Cashback	21/11/2024	1.4128	81.00€	-	5.65€
Booking - PLN	Plutus	Cashback	21/11/2024	1.6047	92.00€	-	6.42€
EuroDisney - PLN	Plutus	Cashback	21/11/2024	9.3488	536.00€	-	37.40€
Booking - PLN	Plutus	Cashback	21/11/2024	0.9755	55.93€	-	3.90€
Santander	Santander	Cashback	15/11/2024	-	-	-	1.25€
Instagram	MBWay	Others	13/11/2024	-	-	-	37.00€
Plutus Perk (Curve)	Plutus	Cashback	11/11/2024	6.5294	9.99€	-	26.12€
Curve - Continente	Curve	Cashback	11/11/2024	-	-	£0.01	0.01€
Instagram	MBWay	Others	10/11/2024	-	-	-	5.00€
Temu	LetyShops	Cashback	07/11/2024	-	-	-	1.01€
Plutus Bonus	Plutus	Cashback	06/11/2024	7.2000	0.00€	-	28.80€
Test'em All	PayPal	Surveys	06/11/2024	-	-	-	0.25€
Nicequest - Amazon	Vale	Surveys	05/11/2024	-	-	-	5€
Nicequest - Amazon	Vale	Surveys	05/11/2024	-	-	-	5€
AliExpress	LetyShops	Cashback	05/11/2024	-	-	-	2.20€
beRuby	PayPal	Surveys	05/11/2024	-	-	-	10.00€
miio	Vale	Cashback	04/11/2024	-	-	-	20€
AttaPoll	PayPal	Surveys	31/10/2024	-	-	-	7.60€
AttaPoll	PayPal	Surveys	31/10/2024	-	-	-	8.23€
Poll Pay	PayPal 	Surveys	31/10/2024	-	-	-	5.00€
Curve - MEO	Curve	Cashback	29/10/2024	-	-	£0.49	0.58€
Plutus - Piti	Plutus - Piti	Cashback	29/10/2024	23.1200	-	-	92.48€
Plutus Perk (Continente)	Plutus	Cashback	27/10/2024	5.5556	10.00€	-	22.22€
Curve - Continente	Curve	Cashback	25/10/2024	-	-	£0.08	0.09€
Bulbshare	PayPal	Surveys	25/10/2024	-	-	-	31€
EXS Seguros	Vale	Cashback	25/10/2024	-	-	-	50€
TikTok	MBWay	Others	25/10/2024	-	-	-	11.00€
TikTok	MBWay	Others	24/10/2024	-	-	-	10.00€
Nicequest - Amazon	Vale	Surveys	22/10/2024	-	-	-	15€
Nicequest - Amazon	Vale	Surveys	21/10/2024	-	-	-	10€
SHEIN	LetyShops	Cashback	15/10/2024	-	-	-	3.28€
Santander	Santander	Cashback	15/10/2024	-	-	-	1.22€
AliExpress	LetyShops	Cashback	15/10/2024	-	-	-	0.28€
Notino	LetyShops	Cashback	14/10/2024	-	-	-	0.07€
SHEIN - PLN	Plutus	Cashback	12/10/2024	0.1698	10.53€	-	0.68€
Mercadona - PLN	Plutus	Cashback	12/10/2024	0.1871	11.60€	-	0.75€
Curve - Continente	Curve	Cashback	11/10/2024	-	-	£0.11	0.13€
Plutus Perk (Curve)	Plutus	Cashback	11/10/2024	5.2031	9.99€	-	20.81€
Curve - Booking	Curve	Cashback	07/10/2024	-	-	£0.68	0.80€
Curve - BP	Curve	Cashback	06/10/2024	-	-	£0.07	0.08€
Curve - Booking	Curve	Cashback	05/10/2024	-	-	£0.47	0.55€
Hospital da Luz - PLN	Plutus	Cashback	05/10/2024	0.3892	27.50€	-	1.56€
AliExpress	LetyShops	Cashback	01/10/2024	-	-	-	2.07€
Legumes e out vícios - PLN	Plutus	Cashback	01/10/2024	0.5193	36.70€	-	2.08€
Booking - PLN	Plutus	Cashback	01/10/2024	40.2812	2,913.67€	-	161.12€
Plutus Perk (Booking)	Plutus	Cashback	01/10/2024	4.6083	10.00€	-	18.43€
AttaPoll	Revolut	Surveys	30/09/2024	-	-	-	7.89€
AttaPoll	PayPal	Surveys	30/09/2024	-	-	-	12.69€
AliExpress	LetyShops	Cashback	30/09/2024	-	-	-	0.13€
Curve - MEO	Curve	Cashback	30/09/2024	-	-	£0.34	0.40€
Ticketline - PLN	Plutus	Cashback	30/09/2024	0.9831	69.80€	-	3.93€
Booking - PLN	Plutus	Cashback	30/09/2024	1.3006	92.34€	-	5.20€
Spartoo - PLN	Plutus	Cashback	30/09/2024	1.0845	77.00€	-	4.34€
Curve - Booking	Curve	Cashback	29/09/2024	-	-	£24.42	28.82€
Curve - Booking	Curve	Cashback	29/09/2024	-	-	£0.77	0.91€
Plutus - Piti	Plutus - Piti	Cashback	29/09/2024	15.8000	-	-	63.20€
Uber - PLN	Plutus	Cashback	29/09/2024	0.0904	7.05€	-	0.36€
Uber - PLN	Plutus	Cashback	28/09/2024	0.0541	3.95€	-	0.22€
Continente - PLN	Plutus	Cashback	28/09/2024	0.2643	20.26€	-	1.06€
Uber - PLN	Plutus	Cashback	28/09/2024	0.0004	0.03€	-	0.002€
Uber - PLN	Plutus	Cashback	28/09/2024	0.0510	3.69€	-	0.20€
Curve - Booking	Curve	Cashback	28/09/2024	-	-	£0.77	0.91€
Pastelaria Gregório - PLN	Plutus	Cashback	27/09/2024	0.0311	2.35€	-	0.12€
Uber - PLN	Plutus	Cashback	27/09/2024	0.0741	5.26€	-	0.30€
Curve - Continente	Curve	Cashback	26/09/2024	-	-	£0.17	0.20€
Amazon - PLN	Plutus	Cashback	26/09/2024	0.1389	10.00€	-	0.56€
Mida Service - PLN	Plutus	Cashback	25/09/2024	8.5407	595.00€	-	34.16€
BP - PLN	Plutus	Cashback	22/09/2024	0.5827	29.04€	-	2.33€
Sfera - PLN	Plutus	Cashback	22/09/2024	0.4336	29.05€	-	1.73€
Hospital da Luz - PLN	Plutus	Cashback	21/09/2024	1.2879	85.00€	-	5.15€
Curve - BP	Curve	Cashback	20/09/2024	-	-	£0.33	0.39€
Ticketline - PLN	Plutus	Cashback	19/09/2024	0.6608	42.95€	-	2.64€
Instagram	MBWay	Others	19/09/2024	-	-	-	14.00€
Instagram	MBWay	Others	18/09/2024	-	-	-	24.00€
Amazon - PLN	Plutus	Cashback	18/09/2024	0.2279	15.04€	-	0.91€
Plutus Perk (Curve)	Plutus	Cashback	18/09/2024	5.0201	9.99€	-	20.08€
Plutus Perk (Galp)	Plutus	Cashback	18/09/2024	5.0761	10.00€	-	20.30€
Instagram	MBWay	Others	16/09/2024	-	-	-	44.00€
Plutus Referral - Bruno	Plutus	Cashback	31/08/2024	4.1800	-	-	16.72€
Auchan - PLN	Plutus	Cashback	16/09/2024	0.0018	0.12€	-	0.01€
Companhia das Sandes - PLN	Plutus	Cashback	16/09/2024	0.0431	2.80€	-	0.17€
H3 - PLN	Plutus	Cashback	16/09/2024	0.3111	21.05€	-	1.24€
Tendenze - PLN	Plutus	Cashback	16/09/2024	0.8088	55.00€	-	3.24€
Santander	Santander	Cashback	15/09/2024	-	-	-	5.05€
Hector Cafe - PLN	Plutus	Cashback	14/09/2024	0.0340	2.40€	-	0.14€
Tania Bazar - PLN	Plutus	Cashback	14/09/2024	0.2830	20.00€	-	1.13€
CONAD - PLN	Plutus	Cashback	14/09/2024	0.1125	7.84€	-	0.45€
Tania Bazar - PLN	Plutus	Cashback	14/09/2024	0.1485	10.00€	-	0.59€
La Rinascente Cagliari - PLN	Plutus	Cashback	14/09/2024	0.5599	37.70€	-	2.24€
Tania Bazar - PLN	Plutus	Cashback	14/09/2024	0.0213	1.50€	-	0.09€
Smeet - PLN	Plutus	Cashback	14/09/2024	0.0735	5.00€	-	0.29€
Star srls - PLN	Plutus	Cashback	13/09/2024	0.4264	29.99€	-	1.71€
Trattoria Bella Roma - PLN	Plutus	Cashback	13/09/2024	0.4052	28.50€	-	1.62€
Bar the One - PLN	Plutus	Cashback	13/09/2024	0.0423	3.00€	-	0.17€
Panefratteria - PLN	Plutus	Cashback	13/09/2024	0.5047	35.50€	-	2.02€
Caffe La Piazza - PLN	Plutus	Cashback	13/09/2024	0.0169	1.20€	-	0.07€
CONAD - PLN	Plutus	Cashback	12/09/2024	0.1412	10.17€	-	0.56€
Aspo Olbia - PLN	Plutus	Cashback	12/09/2024	0.0417	3.00€	-	0.17€
Moka Service - PLN	Plutus	Cashback	12/09/2024	0.0276	2.00€	-	0.11€
Pepebianco - PLN	Plutus	Cashback	12/09/2024	0.4836	34.50€	-	1.93€
Barroseddu - PLN	Plutus	Cashback	12/09/2024	0.0329	2.40€	-	0.13€
Dorgali Ita - PLN	Plutus	Cashback	12/09/2024	0.0069	0.50€	-	0.03€
Rent Stern - PLN	Plutus	Cashback	12/09/2024	0.0173	1.25€	-	0.07€
Pirani - PLN	Plutus	Cashback	11/09/2024	0.0396	2.80€	-	0.16€
Smeet Cagliari - PLN	Plutus	Cashback	11/09/2024	0.0423	3.00€	-	0.17€
COSIR SRL - PLN	Plutus	Cashback	11/09/2024	1.6598	118.40€	-	6.64€
UBER - PLN	Plutus	Cashback	11/09/2024	0.1893	13.50€	-	0.76€
Smeet Cagliari - PLN	Plutus	Cashback	11/09/2024	0.1132	8.00€	-	0.45€
Booking - PLN	Plutus	Cashback	10/09/2024	0.9155	65.00€	-	3.66€
CONAD Cagliari - PLN	Plutus	Cashback	10/09/2024	0.1412	9.93€	-	0.56€
Caffe Roma - PLN	Plutus	Cashback	09/09/2024	0.0396	2.80€	-	0.16€
Ditta Salis - PLN	Plutus	Cashback	09/09/2024	0.0371	2.60€	-	0.15€
CONAD Santantioco - PLN	Plutus	Cashback	09/09/2024	0.1026	7.25€	-	0.41€
Gelizia SNC - PLN	Plutus	Cashback	09/09/2024	0.1127	8.00€	-	0.45€
Jungle Café Cagliari - PLN	Plutus	Cashback	09/09/2024	0.0764	5.40€	-	0.31€
Bar Centrale Cagliari - PLN	Plutus	Cashback	08/09/2024	0.0837	6.00€	-	0.33€
QUANTOBASTA RESTAURANTE - PLN	Plutus	Cashback	08/09/2024	0.3303	24.00€	-	1.32€
SOC SERVIZI SOMM - PLN	Plutus	Cashback	08/09/2024	0.0747	5.40€	-	0.30€
H3 - PLN	Plutus	Cashback	07/09/2024	0.1120	8.25€	-	0.45€
Ticketline - PLN	Plutus	Cashback	06/09/2024	0.4521	34.36€	-	1.81€
Tomatino - PLN	Plutus	Cashback	06/09/2024	0.1079	8.20€	-	0.43€
Barbearia São José - PLN	Plutus	Cashback	06/09/2024	0.1883	14.00€	-	0.75€
McDonalds - PLN	Plutus	Cashback	06/09/2024	0.1009	7.50€	-	0.40€
Curve - Booking	Curve	Cashback	07/09/2024	-	-	£0.56	0.66€
Plutus Perk - Bonus (Galp)	Plutus	Cashback	05/09/2024	4.4200	10.00€	-	17.68€
Continente - PLN	Plutus	Cashback	05/09/2024	0.1416	11.09€	-	0.57€
Plutus Perk (Continente)	Plutus	Cashback	05/09/2024	4.2553	10.00€	-	17.02€
Galp Ademia - PLN	Plutus	Cashback	05/09/2024	0.5723	45.02€	-	2.29€
Poll Pay	PayPal	Surveys	05/09/2024	-	-	-	15.00€
Porto Editora - PLN	Plutus	Cashback	01/09/2024	0.2143	17.00€	-	0.86€
Curve - Continente	Curve	Cashback	01/09/2024	-	-	£0.18	0.21€
AttaPoll	PayPal	Surveys	31/08/2024	-	-	-	4.32€
Vasco da Gama - PLN	Plutus	Cashback	30/08/2024	0.0250	2.10€	-	0.10€
MEO - PLN	Plutus	Cashback	30/08/2024	0.4880	40.99€	-	1.95€
Continente - PLN	Plutus	Cashback	30/08/2024	1.0293	86.46€	-	4.12€
Balance Café Portimão - PLN	Plutus	Cashback	30/08/2024	0.6131	51.50€	-	2.45€
CP - PLN	Plutus	Cashback	30/08/2024	0.5536	46.50€	-	2.21€
Tasca Maria - PLN	Plutus	Cashback	30/08/2024	0.7571	63.60€	-	3.03€
Exe Wellington - PLN	Plutus	Cashback	30/08/2024	0.4512	39.70€	-	1.80€
Booking CZ - PLN	Plutus	Cashback	28/08/2024	3.2873	266.27€	-	13.15€
National Theatre CZ - PLN	Plutus	Cashback	28/08/2024	1.3715	111.09€	-	5.49€
EasyJet - PLN	Plutus	Cashback	28/08/2024	6.6412	537.94€	-	26.56€
SHEIN	LetyShops	Cashback	27/08/2024	-	-	-	0.18€
Curve - MEO	Curve	Cashback	26/08/2024	-	-	£0.35	0.41€
Plutus - Piti	Plutus - Piti	Cashback	26/08/2024	15.9900	-	-	63.96€
Gelataria Alvor - PLN	Plutus	Cashback	26/08/2024	0.1244	9.70€	-	0.50€
Brisa Área Serviço - PLN	Plutus	Cashback	26/08/2024	0.1000	7.80€	-	0.40€
A12 Setúbal - PLN	Plutus	Cashback	26/08/2024	0.2942	22.95€	-	1.18€
SumUp Sombra Exemplar - PLN	Plutus	Cashback	26/08/2024	0.0649	5.00€	-	0.26€
WYNDHAM ALVOR BEACH - PLN	Plutus	Cashback	26/08/2024	0.2078	16.00€	-	0.83€
Curve - Continente	Curve	Cashback	26/08/2024	-	-	£0.74	0.87€
A S Av Berlim - PLN	Plutus	Cashback	25/08/2024	0.5884	45.31€	-	2.35€
Ao pé das letras - PLN	Plutus	Cashback	25/08/2024	0.1429	11.00€	-	0.57€
Booking - PLN	Plutus	Cashback	25/08/2024	0.9678	74.52€	-	3.87€
Metro Lisboa - PLN	Plutus	Cashback	24/08/2024	0.0113	0.80€	-	0.05€
Metro Lisboa - PLN	Plutus	Cashback	24/08/2024	0.0142	1.00€	-	0.06€
Curve - Booking	Curve	Cashback	23/08/2024	-	-	£2.29	2.70€
Lusoponte - PLN	Plutus	Cashback	21/08/2024	0.0455	3.20€	-	0.18€
VIP INN Berna Hotel - PLN	Plutus	Cashback	20/08/2024	0.0563	4.00€	-	0.23€
A2 Albufeira - PLN	Plutus	Cashback	18/08/2024	0.3033	22.95€	-	1.21€
Santander	Santander	Cashback	15/08/2024	-	-	-	2.29€
Staples - PLN	Plutus	Cashback	14/08/2024	0.0035	0.26€	-	0.01€
Curve - Booking	Curve	Cashback	12/08/2024	-	-	£0.64	0.76€
AliPay - PLN	Plutus	Cashback	11/08/2024	0.1040	7.52€	-	0.42€
Galp - PLN	Plutus	Cashback	11/08/2024	0.6529	47.23€	-	2.61€
Plutus Perk (Curve)	Plutus	Cashback	11/08/2024	4.8029	9.99€	-	19.21€
5aSec - PLN	Plutus	Cashback	08/08/2024	0.3095	19.50€	-	1.24€
Continente - PLN	Plutus	Cashback	08/08/2024	0.6979	47.69€	-	2.79€
Mania Poke Bowls - PLN	Plutus	Cashback	08/08/2024	0.3587	22.60€	-	1.43€
Margarida Restaurante - PLN	Plutus	Cashback	08/08/2024	0.5387	34.30€	-	2.15€
Sabores do Mondego - PLN	Plutus	Cashback	08/08/2024	0.1351	8.60€	-	0.54€
Plutus Perk (Uber)	Plutus	Cashback	08/08/2024	5.2910	10.00€	-	21.16€
McDonalds - PLN	Plutus	Cashback	08/08/2024	0.0944	5.95€	-	0.38€
PICSIL - PLN	Plutus	Cashback	08/08/2024	1.2708	80.91€	-	5.08€
AttaPoll	PayPal	Surveys	07/08/2024	-	-	-	3.01€
AttaPoll	PayPal	Surveys	06/08/2024	-	-	-	2.83€
AttaPoll	PayPal	Surveys	05/08/2024	-	-	-	3.58€
beRuby	PayPal	Surveys	05/08/2024	-	-	-	10.00€
AliExpress	LetyShops	Cashback	03/08/2024	-	-	-	0.08€
AliExpress	LetyShops	Cashback	03/08/2024	-	-	-	0.39€
Continente - PLN	Plutus	Cashback	03/08/2024	0.0121	0.90€	-	0.05€
MEO - PLN	Plutus	Cashback	03/08/2024	0.5432	40.92€	-	2.17€
Continente - PLN	Plutus	Cashback	03/08/2024	0.3179	23.95€	-	1.27€
Plutus Perk (Amazon)	Plutus	Cashback	03/08/2024	4.5045	10.00€	-	18.02€
Almedina - PLN	Plutus	Cashback	03/08/2024	0.2014	15.04€	-	0.81€
Curve - Continente	Curve	Cashback	02/08/2024	-	-	£0.41	0.48€
Curve - Continente	Curve	Cashback	01/08/2024	-	-	£0.21	0.25€
Curve - MEO	Curve	Cashback	01/08/2024	-	-	£0.35	0.41€
Continente - PLN	Plutus	Cashback	01/08/2024	0.2015	17.60€	-	0.81€
Plutus Perk (Continente)	Plutus	Cashback	01/08/2024	3.8168	10.00€	-	15.27€
Manjar do Retiro - PLN	Plutus	Cashback	01/08/2024	0.5471	47.60€	-	2.19€
Zippy - PLN	Plutus	Cashback	01/08/2024	0.6203	54.17€	-	2.48€
BOL - PLN	Plutus	Cashback	01/08/2024	0.6148	53.69€	-	2.46€
Plutus Perk - Bonus (Galp)	Plutus	Cashback	01/08/2024	3.0300	0.00€	-	12.12€
Instagram	MBWay	Others	31/07/2024	-	-	-	6.00€
Continente - PLN	Plutus	Cashback	29/07/2024	0.1517	10.24€	-	0.61€
Plutus Perk (Continente)	Plutus	Cashback	29/07/2024	3.7037	10.00€	-	14.81€
Curve - Continente	Curve	Cashback	26/07/2024	-	-	£0.17	0.20€
Curve - Continente	Curve	Cashback	26/07/2024	-	-	£0.24	0.28€
Pingo Doce - PLN	Plutus	Cashback	26/07/2024	0.0858	5.90€	-	0.34€
Plutus Perk (Pingo Doce)	Plutus	Cashback	26/07/2024	3.6364	10.00€	-	14.55€
Plutus - Piti	Plutus - Piti	Cashback	26/07/2024	12.1000	-	-	48.40€
AttaPoll	PayPal	Surveys	26/07/2024	-	-	-	2.55€
Tomatino - PLN	Plutus	Cashback	25/07/2024	0.1197	8.20€	-	0.48€
Curve - Pingo Doce	Curve	Cashback	24/07/2024	-	-	£0.14	0.17€
AttaPoll	PayPal	Surveys	22/07/2024	-	-	-	3.43€
Choupana - PLN	Plutus	Cashback	19/07/2024	0.2475	17.20€	-	0.99€
Santander	Santander	Cashback	16/07/2024	-	-	-	1.25€
Curve - Continente	Curve	Cashback	16/07/2024	-	-	£0.01	0.01€
AttaPoll	PayPal	Surveys	15/07/2024	-	-	-	2.51€
YouGov	TB	Surveys	15/07/2024	-	-	-	25.00€
Galp - PLN	Plutus	Cashback	15/07/2024	0.7079	46.50€	-	2.83€
CP - PLN	Plutus	Cashback	14/07/2024	0.6596	46.50€	-	2.64€
Praxis - PLN	Plutus	Cashback	14/07/2024	2.6237	183.00€	-	10.49€
McDonalds - PLN	Plutus	Cashback	13/07/2024	0.0765	5.30€	-	0.31€
Plutus Perk (McDonalds)	Plutus	Cashback	13/07/2024	0.2347	0.65€	-	0.94€
Barbearia S. José - PLN	Plutus	Cashback	12/07/2024	0.1972	14.00€	-	0.79€
Plutus Perk (Curve)	Plutus	Cashback	11/07/2024	3.5552	9.99€	-	14.22€
Notino	LetyShops	Cashback	10/07/2024	-	-	-	0.26€
Bertrand - PLN	Plutus	Cashback	10/07/2024	0.2996	20.90€	-	1.20€
Sabores do Mondego - PLN	Plutus	Cashback	10/07/2024	0.2475	17.20€	-	0.99€
Heaven Sleepy - PLN	Plutus	Cashback	09/07/2024	0.7299	53.10€	-	2.92€
LIDL - PLN	Plutus	Cashback	09/07/2024	0.1892	13.53€	-	0.76€
Plutus Perk (LIDL)	Plutus	Cashback	09/07/2024	3.4965	10.00€	-	13.99€
Orquestra dos Sabores - PLN	Plutus	Cashback	09/07/2024	0.0224	1.60€	-	0.09€
Cismanso - PLN	Plutus	Cashback	08/07/2024	0.0418	3.00€	-	0.17€
Curve - LIDL	Curve	Cashback	07/07/2024	-	-	£0.20	0.24€
Cismanso - PLN	Plutus	Cashback	07/07/2024	0.5779	44.50€	-	2.31€
Cismanso - PLN	Plutus	Cashback	07/07/2024	2.9498	220.50€	-	11.80€
TymRest - PLN	Plutus	Cashback	07/07/2024	0.1131	8.00€	-	0.45€
Booking - PLN	Plutus	Cashback	06/07/2024	6.8911	522.00€	-	27.56€
Booking Cars - PLN	Plutus	Cashback	06/07/2024	2.7132	199.42€	-	10.85€
Plutus Perk (Booking)	Plutus	Cashback	06/07/2024	3.3003	10.00€	-	13.20€
Ticketline - PLN	Plutus	Cashback	05/07/2024	0.3855	30.07€	-	1.54€
Vitaminas - PLN	Plutus	Cashback	05/07/2024	0.1605	12.40€	-	0.64€
Curve - Cars Booking	Curve	Cashback	04/07/2024	-	-	£0.72	0.85€
AttaPoll	PayPal	Surveys	04/07/2024	-	-	-	3.06€
AttaPoll	PayPal	Surveys	04/07/2024	-	-	-	2.96€
Galp Ademia - PLN	Plutus	Cashback	03/07/2024	0.4526	37.00€	-	1.81€
Plutus Perk (McDonalds)	Plutus	Cashback	03/07/2024	2.8419	9.35€	-	11.37€
Forneria - PLN	Plutus	Cashback	01/07/2024	0.5241	43.50€	-	2.10€
Vista Alegre - PLN	Plutus	Cashback	01/07/2024	0.1697	14.00€	-	0.68€
Vista Alegre - PLN	Plutus	Cashback	01/07/2024	0.7635	63.75€	-	3.05€
Sabores do Mondego - PLN	Plutus	Cashback	30/06/2024	0.2164	17.20€	-	0.87€
Buganço - PLN	Plutus	Cashback	30/06/2024	0.8368	68.62€	-	3.35€
Ticketline - PLN	Plutus	Cashback	30/06/2024	0.5585	45.10€	-	2.23€
Continente - PLN	Plutus	Cashback	30/06/2024	0.1606	12.93€	-	0.64€
Curve - Booking	Curve	Cashback	29/06/2024	-	-	£4.57	5.39€
SHEIN - PLN	Plutus	Cashback	29/06/2024	0.3499	29.13€	-	1.40€
Curve - Continente	Curve	Cashback	28/06/2024	-	-	£0.11	0.13€
H3 - PLN	Plutus	Cashback	28/06/2024	0.1410	11.60€	-	0.56€
SHEIN	LetyShops	Cashback	27/06/2024	-	-	-	0.32€
MEO - PLN	Plutus	Cashback	27/06/2024	0.4909	40.99€	-	1.96€
AttaPoll	PayPal	Surveys	26/06/2024	-	-	-	2.76€
RYANAIR - PLN	Plutus	Cashback	26/06/2024	7.6498	638.76€	-	30.60€
AttaPoll	PayPal	Surveys	25/06/2024	-	-	-	3.59€
JD Sports	LetyShops	Cashback	25/06/2024	-	-	-	1.31€
Curve - MEO	Curve	Cashback	25/06/2024	-	-	£0.35	0.41€
Plutus - Piti	Plutus - Piti	Cashback	25/06/2024	10.1300	-	-	40.52€
ALDI - PLN	Plutus	Cashback	25/06/2024	0.0237	2.05€	-	0.09€
Plutus Perk (ALDI)	Plutus	Cashback	25/06/2024	2.8902	10.00€	-	11.56€
LIDL - PLN	Plutus	Cashback	25/06/2024	0.0286	2.70€	-	0.11€
Plutus Perk (LIDL)	Plutus	Cashback	25/06/2024	2.6455	10.00€	-	10.58€
Booking	MBWay	Others	24/06/2024	-	-	-	4.00€
Curve - Continente	Curve	Cashback	23/06/2024	-	-	£0.11	0.13€
Continente - PLN	Plutus	Cashback	23/06/2024	0.1154	8.60€	-	0.46€
Booking	MBWay	Others	23/06/2024	-	-	-	11.00€
TikTok	MBWay	Others	19/06/2024	-	-	-	3.00€
Continente - PLN	Plutus	Cashback	18/06/2024	0.8914	77.11€	-	3.57€
H3 - PLN	Plutus	Cashback	18/06/2024	0.2558	22.00€	-	1.02€
Leroy Merlin - PLN	Plutus	Cashback	18/06/2024	0.0069	0.60€	-	0.03€
Nicequest	Vale	Surveys	17/06/2024	-	-	-	25€
Curve - Pingo Doce	Curve	Cashback	16/06/2024	-	-	£0.66	0.78€
McDonalds - PLN	Plutus	Cashback	15/06/2024	0.1076	9.19€	-	0.43€
Primark - PLN	Plutus	Cashback	15/06/2024	0.2363	20.20€	-	0.95€
Poke Bowls - PLN	Plutus	Cashback	15/06/2024	0.1304	11.15€	-	0.52€
Clinica Sta Madalena - PLN	Plutus	Cashback	15/06/2024	0.2339	20.00€	-	0.94€
SHEIN	LetyShops	Cashback	15/06/2024	-	-	-	0.56€
Santander	Santander	Cashback	15/06/2024	-	-	-	2.56€
JD Sports	LetyShops	Cashback	14/06/2024	-	-	-	1.57€
Poll Pay	PayPal	Surveys	14/06/2024	-	-	-	10.00€
Leroy Merlin - PLN	Plutus	Cashback	13/06/2024	0.3770	33.65€	-	1.51€
Poll Pay	PayPal	Surveys	12/06/2024	-	-	-	10.00€
AttaPoll	PayPal	Surveys	11/06/2024	-	-	-	3.31€
AttaPoll	PayPal	Surveys	11/06/2024	-	-	-	4.16€
Plutus Perk (Curve)	Plutus	Cashback	11/06/2024	2.7597	9.99€	-	11.04€
Leroy Merlin - PLN	Plutus	Cashback	11/06/2024	0.1817	16.57€	-	0.73€
Bagga - PLN	Plutus	Cashback	10/06/2024	0.0513	4.80€	-	0.21€
Uber Eats - PLN	Plutus	Cashback	09/06/2024	0.2691	26.10€	-	1.08€
NOBULL - PLN	Plutus	Cashback	08/06/2024	1.5692	153.00€	-	6.28€
Worten - PLN	Plutus	Cashback	07/06/2024	5.7490	563.40€	-	23.00€
Worten (Máquina Lavar)	LetyShops	Cashback	06/06/2024	-	563.40€	-	10.00€
Worten (Switch)	LetyShops	Cashback	06/06/2024	-	13.00€	-	0.29€
beRuby	PayPal	Surveys	05/06/2024	-	-	-	10.00€
Continente - PLN	Plutus	Cashback	05/06/2024	0.7151	70.44€	-	2.86€
Continente - PLN	Plutus	Cashback	05/06/2024	0.2944	29.00€	-	1.18€
Plutus Perk (Continente)	Plutus	Cashback	05/06/2024	2.5381	10.00€	-	10.15€
Delitruques - PLN	Plutus	Cashback	05/06/2024	0.0447	4.40€	-	0.18€
Galp - PLN	Plutus	Cashback	04/06/2024	0.5051	49.88€	-	2.02€
Plutus Perk (Galp) (BN)	Plutus	Cashback	04/06/2024	2.5700	-	-	10.28€
NOBULL - PLN	Plutus	Cashback	04/06/2024	5.1342	507.00€	-	20.54€
Worten - PLN	Plutus	Cashback	04/06/2024	0.1310	13.00€	-	0.52€
Pingo Doce - PLN	Plutus	Cashback	04/06/2024	0.0152	1.49€	-	0.06€
Plutus Perk (Pingo Doce)	Plutus	Cashback	04/06/2024	2.5575	-	-	10.23€
AttaPoll	PayPal	Surveys	03/06/2024	-	-	-	4.81€
Mercadona - PLN	Plutus	Cashback	03/06/2024	0.2251	22.00€	-	0.90€
Plutus Perk (Mercadona)	Plutus	Cashback	03/06/2024	2.5575	-	-	10.23€
Curve - Pingo Doce	Curve	Cashback	01/06/2024	-	-	£0.10	0.12€
Curve - Mercadona	Curve	Cashback	01/06/2024	-	-	£0.27	0.32€
Poll Pay	PayPal	Surveys	01/06/2024	-	-	-	10.00€
Booking Cashback	Deco+	Cashback	01/06/2024	-	-	-	6.50€
Curve - Continente	Curve	Cashback	30/05/2024	-	-	£0.34	0.40€
Spotify	MBWay	Others	30/05/2024	-	-	-	12.00€
TikTok	MBWay	Others	29/05/2024	-	-	-	6.00€
TikTok	MBWay	Others	29/05/2024	-	-	-	5.00€
Curve - Continente	Curve	Cashback	28/05/2024	-	-	£0.61	0.72€
AttaPoll - Piti	PayPal	Surveys	28/05/2024	-	-	-	3.80€
TikTok	MBWay	Others	28/05/2024	-	-	-	3.00€
MEO - PLN	Plutus	Cashback	25/05/2024	0.3922	40.99€	-	1.57€
Modern Mystery - PLN	Plutus	Cashback	25/05/2024	0.1349	14.00€	-	0.54€
Plutus - Piti	Plutus - Piti	Cashback	24/05/2024	4.3300	-	-	17.32€
Modern Mystery - PLN	Plutus	Cashback	24/05/2024	0.0499	5.20€	-	0.20€
Pingo Doce - PLN	Plutus	Cashback	24/05/2024	0.0312	3.24€	-	0.12€
Plutus Perk (Pingo Doce)	Plutus	Cashback	24/05/2024	2.4038	-	-	9.62€
Curve - MEO	Curve	Cashback	23/05/2024	-	40.99€	£0.35	0.41€
TikTok	MBWay	Others	20/05/2024	-	-	-	33.00€
Plutus Perk (Booking)	Plutus	Cashback	19/05/2024	2.5381	-	-	10.15€
Booking - PLN	Plutus	Cashback	19/05/2024	10.6126	1,045.33€	-	42.45€
BOL - PLN	Plutus	Cashback	17/05/2024	0.5259	51.54€	-	2.10€
BCM Bricolage Leroy - PLN	Plutus	Cashback	17/05/2024	0.3560	34.97€	-	1.42€
Taberna Londrina - PLN	Plutus	Cashback	17/05/2024	0.3450	33.90€	-	1.38€
Continente - PLN	Plutus	Cashback	17/05/2024	0.2263	22.23€	-	0.91€
Curve - Pingo Doce	Curve	Cashback	22/05/2024	-	-	£0.11	0.13€
Curve - Booking	Curve	Cashback	15/05/2024	-	1,045.33€	£9.07	10.70€
Santander	Santander	Cashback	15/05/2024	-	-	-	8.07€
Curve - Continente	Curve	Cashback	13/05/2024	-	22.23€	£0.19	0.22€
Hospital da Luz - PLN	Plutus	Cashback	13/05/2024	0.1879	19.73€	-	0.75€
Osteria 44 - PLN	Plutus	Cashback	13/05/2024	0.5907	60.55€	-	2.36€
TikTok	MBWay	Others	12/05/2024	-	-	-	13.00€
Vitaminas - PLN	Plutus	Cashback	12/05/2024	0.1283	13.50€	-	0.51€
Plutus Perk (Lidl)	Plutus	Cashback	12/05/2024	2.4485	-	-	9.79€
AttaPoll - Piti	PayPal	Surveys	09/05/2024	-	-	-	3.45€
ALDI - PLN	Plutus	Cashback	09/05/2024	0.0088	0.93€	-	0.04€
Ingrediente IPN - PLN	Plutus	Cashback	09/05/2024	0.1229	13.00€	-	0.49€
Intermarche - PLN	Plutus	Cashback	09/05/2024	0.0198	2.09€	-	0.08€
Pizzaiolo - PLN	Plutus	Cashback	09/05/2024	0.1816	19.20€	-	0.73€
Continente - PLN	Plutus	Cashback	09/05/2024	0.0638	6.75€	-	0.26€
LIDL - PLN	Plutus	Cashback	09/05/2024	0.1282	13.56€	-	0.51€
Plutus Perk - LIDL	Plutus	Cashback	09/05/2024	2.3641	10.00€	-	9.46€
Continente - PLN	Plutus	Cashback	09/05/2024	0.3671	38.82€	-	1.47€
Ingrediente IPN - PLN	Plutus	Cashback	09/05/2024	0.1182	12.50€	-	0.47€
Plutus Perk - GALP	Plutus	Cashback	07/05/2024	2.6100	10.00€	-	10.44€
Galp Ademia - PLN	Plutus	Cashback	07/05/2024	0.4237	41.10€	-	1.69€
Continente - PLN	Plutus	Cashback	06/05/2024	0.2187	21.27€	-	0.87€
Plutus Perk - Continente	Plutus	Cashback	06/05/2024	2.5707	10.00€	-	10.28€
Osteria 44 - PLN	Plutus	Cashback	06/05/2024	0.2505	24.30€	-	1.00€
Vita Fórum - PLN	Plutus	Cashback	05/05/2024	0.1244	12.00€	-	0.50€
Vita Fórum - PLN	Plutus	Cashback	05/05/2024	0.0984	9.50€	-	0.39€
Sete Restaurante - PLN	Plutus	Cashback	04/05/2024	0.3823	36.70€	-	1.53€
Curve - Galp Ademia	Curve	Cashback	05/05/2024	-	41.10€	£0.35	0.41€
Curve - Osteria 44	Curve	Cashback	04/05/2024	-	24.30€	£0.21	0.25€
Curve - Continente	Curve	Cashback	04/05/2024	-	31.27€	£0.27	0.32€
Curve - Continente	Curve	Cashback	04/05/2024	-	31.27€	£0.27	0.32€
Delitruques - PLN	Plutus	Cashback	04/05/2024	0.0891	8.60€	-	0.36€
Park Hotel - PLN	Plutus	Cashback	04/05/2024	0.0208	2.00€	-	0.08€
Walgreens - PLN	Plutus	Cashback	04/05/2024	0.0964	9.28€	-	0.39€
CP - PLN	Plutus	Cashback	04/05/2024	0.4281	41.20€	-	1.71€
Nyx Abservicio - PLN	Plutus	Cashback	04/05/2024	0.0197	1.90€	-	0.08€
Famous Pioneer - PLN	Plutus	Cashback	04/05/2024	0.3432	33.03€	-	1.37€
Clipper Systems - PLN	Plutus	Cashback	04/05/2024	0.1451	13.97€	-	0.58€
Park Hotel - PLN	Plutus	Cashback	04/05/2024	0.0779	7.50€	-	0.31€
Nyx Abservicio - PLN	Plutus	Cashback	04/05/2024	0.0197	1.90€	-	0.08€
Curve - Vita Fórum	Curve	Cashback	03/05/2024	-	12.00€	£0.10	0.12€
Curve - Vita Fórum	Curve	Cashback	03/05/2024	-	9.50€	£0.08	0.09€
Rejuvemed - PLN	Plutus	Cashback	03/05/2024	3.9360	369.00€	-	15.74€
Naturitas - PLN	Plutus	Cashback	03/05/2024	0.5482	51.26€	-	2.19€
Amazon - PLN	Plutus	Cashback	03/05/2024	2.8648	269.29€	-	11.46€
Plutus Perk (Amazon)	Plutus	Cashback	03/05/2024	2.6596	-	-	10.64€
MEO - PLN	Plutus	Cashback	03/05/2024	0.4372	40.99€	-	1.75€
Curve - Delitruques	Curve	Cashback	02/05/2024	-	8.60€	£0.07	0.08€
McDonalds - PLN	Plutus	Cashback	02/05/2024	0.1592	16.00€	-	0.64€
Plutus Perk (McDonalds)	Plutus	Cashback	02/05/2024	2.5000	-	-	10.00€
Curve - Naturitas	Curve	Cashback	01/05/2024	-	51.26€	£0.44	0.52€
Curve - Amazon	Curve	Cashback	01/05/2024	-	279.29€	£2.40	2.83€
Curve - Aldi	Curve	Cashback	01/05/2024	-	0.93€	£0.01	0.01€
Curve - Pingo Doce	Curve	Cashback	30/04/2024	-	14.01€	£0.12	0.14€
Curve - McDonald's	Curve	Cashback	30/04/2024	-	16.00€	£0.14	0.17€
Curve - Piti	Curve - Piti	Cashback	29/04/2024	-	-	-	1.95€
Plutus Perk (Lidl)	Plutus	Cashback	29/04/2024	2.4631	-	-	9.85€
Plutus Perk (Aldi)	Plutus	Cashback	29/04/2024	2.4691	-	-	9.88€
Plutus Perk (Pingo Doce)	Plutus	Cashback	29/04/2024	2.5000	-	-	10.00€
Plutus - Piti	Plutus - Piti	Cashback	29/04/2024	5.5500	-	-	22.20€
Curve - Continente	Curve	Cashback	28/04/2024	-	20.52€	£0.18	0.21€
Curve - Continente	Curve	Cashback	28/04/2024	-	20.52€	£0.18	0.21€
Curve - Continente	Curve	Cashback	28/04/2024	-	20.07€	£0.17	0.20€
Curve - Continente	Curve	Cashback	28/04/2024	-	20.07€	£0.17	0.20€
Curve - LIDL	Curve	Cashback	27/04/2024	-	15.75€	£0.14	0.17€
Curve - LIDL	Curve	Cashback	27/04/2024	-	15.75€	£0.14	0.17€
Curve - Aldi	Curve	Cashback	27/04/2024	-	10.83€	£0.09	0.11€
Curve - Pingo Doce	Curve	Cashback	27/04/2024	-	14.01€	£0.12	0.14€
Curve - IPN	Curve	Cashback	26/04/2024	-	13.00€	£0.11	0.13€
Curve - IPN	Curve	Cashback	24/04/2024	-	13.00€	£0.11	0.13€
Intermarche	Cetelem	Cashback	23/04/2024	-	2.09€	-	0.06€
Booking Cashback	Deco+	Cashback	23/04/2024	-	-	-	8.50€
Curve - MEO	Curve	Cashback	23/04/2024	-	40.99€	£0.35	0.41€
Curve - MEO	Curve	Cashback	23/04/2024	-	40.99€	£0.35	0.41€
Curve - Rejuvemed	Curve	Cashback	23/04/2024	-	369.00€	£3.17	3.74€
Curve - Praxis	Curve	Cashback	21/04/2024	-	-	£0.35	0.41€
Curve - Continente	Curve	Cashback	21/04/2024	-	-	£0.33	0.39€
Curve - Continente	Curve	Cashback	21/04/2024	-	-	£0.33	0.39€
LIDL	Cetelem	Cashback	20/04/2024	-	11.43€	-	0.34€
LIDL	Cetelem	Cashback	20/04/2024	-	20.25€	-	0.61€
LIDL	Cetelem	Cashback	20/04/2024	-	8.10€	-	0.24€
Delitruques	Cetelem	Cashback	20/04/2024	-	9.70€	-	0.29€
KuVa	Cetelem	Cashback	20/04/2024	-	21.21€	-	0.64€
Curve - Intermarche	Curve	Cashback	20/04/2024	-	-	£0.02	0.02€
Curve - LIDL	Curve	Cashback	20/04/2024	-	-	£0.20	0.24€
Curve - LIDL	Curve	Cashback	20/04/2024	-	-	£0.20	0.24€
Repsol	Cetelem	Cashback	19/04/2024	-	41.60€	-	1.25€
Curve - Pizzaiolo	Curve	Cashback	19/04/2024	-	-	£0.17	0.20€
Curve - Continente	Curve	Cashback	18/04/2024	-	6.75€	£0.06	0.07€
Curve - Continente	Curve	Cashback	18/04/2024	-	6.75€	£0.06	0.07€
Ingrediente - PLN	Plutus	Cashback	18/04/2024	0.1376	19.50€	-	0.55€
Rejuvemed - PLN	Plutus	Cashback	18/04/2024	1.0244	177.18€	-	4.10€
Curve - Sete Restaurante	Curve	Cashback	17/04/2024	-	36.70€	£0.32	0.38€
Galp - PLN	Plutus	Cashback	17/04/2024	0.2936	45.02€	-	1.17€
Plutus Perk (Galp)	Plutus	Cashback	17/04/2024	2.1739	10.00€	-	8.70€
Santander	Santander	Cashback	16/04/2024	-	-	-	10.43€
Curve - Ingrediente IPN	Curve	Cashback	16/04/2024	-	19.50€	£0.17	0.20€
Leroy Merlin - PLN	Plutus	Cashback	16/04/2024	0.1537	22.18€	-	0.61€
Vitaminas - PLN	Plutus	Cashback	16/04/2024	0.1282	18.50€	-	0.51€
Curve - Rejuvemed	Curve	Cashback	15/04/2024	-	177.18€	£1.52	1.79€
Curve - Galp	Curve	Cashback	15/04/2024	-	55.02€	£0.47	0.55€
Curve - Vitaminas	Curve	Cashback	14/04/2024	-	18.50€	£0.16	0.19€
Curve - Leroy	Curve	Cashback	14/04/2024	-	-	£0.15	0.18€
Curve - Lidl	Curve	Cashback	13/04/2024	-	17.69€	£0.15	0.18€
Curve - Lidl	Curve	Cashback	13/04/2024	-	17.69€	£0.15	0.18€
Lidl - PLN	Plutus	Cashback	12/04/2024	0.1101	17.69€	-	0.44€
Vitaminas - PLN	Plutus	Cashback	12/04/2024	0.0568	10.00€	-	0.23€
Comp. Sandes - PLN	Plutus	Cashback	12/04/2024	0.0452	7.95€	-	0.18€
Farmacia Barros - PLN	Plutus	Cashback	12/04/2024	0.0831	14.95€	-	0.33€
Podologia - PLN	Plutus	Cashback	12/04/2024	0.2294	40.00€	-	0.92€
Fever - PLN	Plutus	Cashback	12/04/2024	0.3125	55.00€	-	1.25€
Plutus Perk (Curve)	Plutus	Cashback	11/04/2024	1.9360	-	-	7.74€
Curve - Podologia	Curve	Cashback	10/04/2024	-	40.00€	£0.34	0.40€
Curve - Farmácia B.	Curve	Cashback	10/04/2024	-	14.95€	£0.13	0.15€
Curve - Fever	Curve	Cashback	10/04/2024	-	55.00€	£0.47	0.55€
Curve - Vitaminas	Curve	Cashback	10/04/2024	-	10.00€	£0.09	0.11€
Curve - Comp. Sandes	Curve	Cashback	10/04/2024	-	7.95€	£0.07	0.08€
CP - PLN	Plutus	Cashback	10/04/2024	0.2672	46.50€	-	1.07€
Poll Pay	PayPal	Surveys	08/04/2024	-	-	-	10.00€
SHEIN	LetyShops	Cashback	08/04/2024	-	62.98€	-	0.36€
Tomatino - PLN	Plutus	Cashback	07/04/2024	0.0480	8.20€	-	0.19€
SportZone - PLN	Plutus	Cashback	07/04/2024	0.0472	7.99€	-	0.19€
Curve - Lidl	Curve	Cashback	06/04/2024	-	11.43€	£0.10	0.12€
Isey Skyr Bar ehf - PLN	Plutus	Cashback	06/04/2024	0.0476	8.00€	-	0.19€
Samuelsson Selfoss - PLN	Plutus	Cashback	06/04/2024	0.1396	23.46€	-	0.56€
PCDIGA - PLN	Plutus	Cashback	06/04/2024	0.7794	129.90€	-	3.12€
Continente - PLN	Plutus	Cashback	06/04/2024	0.1200	20.28€	-	0.48€
Skool Beans - PLN	Plutus	Cashback	06/04/2024	0.0340	5.72€	-	0.14€
Mal og menning Vei- PLN	Plutus	Cashback	06/04/2024	0.1160	19.48€	-	0.46€
Continente - PLN (part)	Plutus	Cashback	06/04/2024	0.2000	33.80€	-	0.80€
Plutus Perk (Continente)	Plutus	Cashback	06/04/2024	1.9724	-	-	7.89€
Islenski barinn eh - PLN	Plutus	Cashback	06/04/2024	1.1646	195.65€	-	4.66€
AttaPoll - Piti	Revolut	Surveys	05/04/2024	-	-	-	2.56€
UK LTD GATWICK - PLN	Plutus	Cashback	05/04/2024	0.0253	4.33€	-	0.10€
Plutus Referral - Quica	Plutus	Cashback	05/04/2024	1.8400	-	-	7.36€
Curve - Continente	Curve	Cashback	04/04/2024	-	43.80€	£0.38	0.45€
Curve - Continente	Curve	Cashback	04/04/2024	-	20.17€	£0.17	0.20€
Icewear Magasin - PLN	Plutus	Cashback	04/04/2024	0.0399	6.85€	-	0.16€
Metro Sudurlandsbr - PLN	Plutus	Cashback	04/04/2024	0.3298	57.17€	-	1.32€
Islandia Bankastra - PLN	Plutus	Cashback	04/04/2024	0.0254	4.36€	-	0.10€
Bolasmidjan Reykja - PLN	Plutus	Cashback	04/04/2024	0.0279	4.80€	-	0.11€
SIMPLY FOOD - PLN	Plutus	Cashback	03/04/2024	0.1411	25.21€	-	0.56€
Plutus Referral - Tiago	Plutus	Cashback	03/04/2024	1.6500	-	-	6.60€
LIDL	Cetelem	Cashback	29/03/2024	-	11.22€	-	0.34€
beRuby	TB	Surveys	28/03/2024	-	-	-	10.00€
Curve - Booking	Curve	Cashback	28/03/2024	-	-	£0.55	0.65€
Osteria 44	Cetelem	Cashback	27/03/2024	-	34.40€	-	1.03€
Curve - Lidl	Curve	Cashback	27/03/2024	-	-	£0.10	0.12€
Booking Cashback	Deco+	Cashback	26/03/2024	-	-	-	26.00€
Praxis	Cetelem	Cashback	26/03/2024	-	34.45€	-	1.03€
Curve - Booking	Curve	Cashback	26/03/2024	-	69.00€	£0.59	0.70€
Curve - MEO	Curve	Cashback	23/03/2024	-	40.99€	£0.34	0.40€
Curve - Continente	Curve	Cashback	15/03/2024	-	65.53€	£0.56	0.66€
AttaPoll - Piti	Revolut	Surveys	14/03/2024	-	-	-	3.14€
AttaPoll	PayPal	Surveys	12/03/2024	-	-	-	3.24€
Plutus Perk (Curve)	Plutus	Cashback	11/03/2024	2.0020	-	-	8.01€
Curve - Lidl	Curve	Cashback	10/03/2024	-	20.25€	£0.17	0.20€
SportZone	LetyShops	Cashback	23/03/2024	-	28.45€	-	1.17€
Rentalcars	LetyShops	Cashback	22/03/2024	-	500.00€	-	18.07€
Notino	LetyShops	Cashback	22/03/2024	-	26.81€	-	0.44€
Temu	LetyShops	Cashback	07/03/2024	-	14.59€	-	3.60€
Plutus	M - Plutus	Cashback	07/03/2024	-	-	-	-198.66€
Booking ISL - PLN	Plutus	Cashback	07/03/2024	2.2878	367.57€	-	9.15€
AttaPoll	PayPal	Surveys	05/03/2024	-	-	-	3.46€
Curve - Booking	Curve	Cashback	05/03/2024	-	594.74€	£5.11	6.03€
Lidl - PLN	Plutus	Cashback	04/03/2024	0.1180	19.27€	-	0.47€
Plutus Perk (Lidl)	Plutus	Cashback	04/03/2024	2.0408	-	-	8.16€
Plutus Perk (Booking)	Plutus	Cashback	04/03/2024	1.9900	-	-	7.96€
Curve - Lidl	Curve	Cashback	03/03/2024	-	-	£0.07	0.08€
Booking ISL - PLN	Plutus	Cashback	03/03/2024	1.4570	238.46€	-	5.83€
Booking ISL - PLN	Plutus	Cashback	03/03/2024	2.0498	334.80€	-	8.20€
MEO - PLN	Plutus	Cashback	03/03/2024	0.2438	39.90€	-	0.98€
Curve - Lidl	Curve	Cashback	02/03/2024	-	29.27€	£0.25	0.30€
Curve - Booking	Curve	Cashback	02/03/2024	-	238.46€	£2.05	2.42€
Curve - Booking	Curve	Cashback	02/03/2024	-	334.80€	£2.88	3.40€
AttaPoll	PayPal	Surveys	01/03/2024	-	-	-	3.02€
AliExpress	LetyShops	Cashback	01/03/2024	-	4.16€	-	0.10€
Curve - MEO	Curve	Cashback	01/03/2024	-	39.90€	£0.34	0.40€
Souvla	Cetelem	Cashback	29/02/2024	-	37.18€	-	1.12€
Outback	Cetelem	Cashback	29/02/2024	-	43.07€	-	1.29€
Tony's Pizza	Cetelem	Cashback	29/02/2024	-	35.87€	-	1.08€
Trader Joe's	Cetelem	Cashback	29/02/2024	-	30.08€	-	0.90€
Lidl	Cetelem	Cashback	28/02/2024	-	13.31€	-	0.40€
Costure Bistro TV	Cetelem	Cashback	27/02/2024	-	39.65€	-	1.19€
Cortes Gomes Hotel	Cetelem	Cashback	27/02/2024	-	44.46€	-	1.33€
Croissanteria Port	Cetelem	Cashback	27/02/2024	-	8.10€	-	0.24€
Pizzaiolo	Cetelem	Cashback	27/02/2024	-	17.50€	-	0.53€
Cheesecake Factory	Cetelem	Cashback	27/02/2024	-	12.00€	-	0.36€
Continente	Cetelem	Cashback	27/02/2024	-	46.47€	-	1.39€
Curve - Lidl	Curve	Cashback	25/02/2024	-	-	£0.11	0.13€
McDonalds	Cetelem	Cashback	23/02/2024	-	14.44€	-	0.43€
Curve - Continente	Curve	Cashback	23/02/2024	-	-	£0.40	0.47€
Plutus Perk (Curve)	Plutus	Cashback	22/02/2024	1.5000	-	-	6.00€
Plutus Bonus	Plutus	Cashback	22/02/2024	0.2500	0.00€	-	1.00€
HARRAHS GUY FIERI - PLN	Plutus	Cashback	22/02/2024	0.1012	13.87€	-	0.40€
Plutus Bonus	Plutus	Cashback	21/02/2024	4.4800	-	-	17.92€
BONANZA GIFT SHOP - PLN	Plutus	Cashback	18/02/2024	0.1110	16.13€	-	0.44€
Down 2 Earth LV - PLN	Plutus	Cashback	18/02/2024	0.2160	31.32€	-	0.86€
ABC 109 LV - PLN	Plutus	Cashback	18/02/2024	0.0486	6.81€	-	0.19€
Booking - PLN	Plutus	Cashback	17/02/2024	1.1474	170.20€	-	4.59€
Crypto Arena - PLN	Plutus	Cashback	16/02/2024	0.1604	23.52€	-	0.64€
FRITZI COOP - PLN	Plutus	Cashback	16/02/2024	0.1606	24.15€	-	0.64€
Griffith Park - PLN	Plutus	Cashback	16/02/2024	0.0633	9.35€	-	0.25€
LOVE BEVERLY HILLS - PLN	Plutus	Cashback	16/02/2024	0.0241	3.59€	-	0.10€
Farmers Market - PLN	Plutus	Cashback	16/02/2024	0.1760	26.17€	-	0.70€
Santander	Santander	Cashback	15/02/2024	-	-	-	16.21€
Shell - PLN	Plutus	Cashback	15/02/2024	0.6109	90.00€	-	2.44€
Plutus Perk (Shell)	Plutus	Cashback	15/02/2024	2.2624	10.00€	-	9.05€
Santa Cruz Pay - PLN	Plutus	Cashback	14/02/2024	0.0148	2.18€	-	0.06€
BOARDWALK SURF - PLN	Plutus	Cashback	14/02/2024	0.0970	14.19€	-	0.39€
Santa Cruz Pay - PLN	Plutus	Cashback	14/02/2024	0.0632	9.28€	-	0.25€
Google - PLN	Plutus	Cashback	14/02/2024	0.0068	1.00€	-	0.03€
Apple Bar - PLN	Plutus	Cashback	13/02/2024	0.0379	5.58€	-	0.15€
Candy Baron SF - PLN	Plutus	Cashback	13/02/2024	0.0187	2.78€	-	0.07€
San Francisco - PLN	Plutus	Cashback	13/02/2024	0.2105	31.29€	-	0.84€
Blue Bottle - PLN	Plutus	Cashback	13/02/2024	0.0503	7.49€	-	0.20€
Lids - PLN	Plutus	Cashback	12/02/2024	0.0745	11.10€	-	0.30€
Plutus	M - Plutus	Cashback	10/02/2024	-	-	-	-19.99€
Curve - Booking	Curve	Cashback	07/02/2024	-	146.00€	£1.46	1.72€
MO - PLN	Plutus	Cashback	06/02/2024	0.2691	41.00€	-	1.08€
RCM IT Shop - PLN	Plutus	Cashback	03/02/2024	3.0197	459.00€	-	12.08€
AttaPoll	PayPal	Surveys	02/02/2024	-	-	-	3.27€
AttaPoll - Piti	PayPal	Surveys	02/02/2024	-	-	-	3.10€
AttaPoll	PayPal	Surveys	01/02/2024	-	-	-	3.34€
Booking Cashback	Deco+	Cashback	30/01/2024	-	-	-	2.50€
AttaPoll	PayPal	Surveys	26/01/2024	-	-	-	3.05€
AliExpress	LetyShops	Cashback	25/01/2024	-	1.19€	-	0.36€
Curve - MEO	Curve	Cashback	25/01/2024	-	-	£0.46	0.54€
Plutus Bonus	Plutus	Cashback	23/01/2024	1.0000	-	-	4.00€
Airalo	LetyShops	Cashback	21/01/2024	-	11.60€	-	0.89€
Airalo	LetyShops	Cashback	21/01/2024	-	11.60€	-	0.89€
Curve - Continente	Curve	Cashback	21/01/2024	-	-	£0.52	0.61€
Airalo - PLN	Plutus	Cashback	21/01/2024	0.0760	11.99€	-	0.30€
Airalo - PLN	Plutus	Cashback	21/01/2024	0.0673	10.65€	-	0.27€
DOTE - PLN	Plutus	Cashback	18/01/2024	0.0932	15.50€	-	0.37€
Booking OPO (part) - PLN	Plutus	Cashback	17/01/2024	0.2840	46.00€	-	1.14€
Plutus Perk (Booking)	Plutus	Cashback	17/01/2024	2.0576	-	-	8.23€
AliExpress	LetyShops	Cashback	17/01/2024	-	2.79€	-	0.14€
Hospital da Luz - PLN	Plutus	Cashback	17/01/2024	0.3145	50.00€	-	1.26€
CP - PLN	Plutus	Cashback	17/01/2024	0.2912	46.50€	-	1.16€
Rituals - PLN	Plutus	Cashback	17/01/2024	0.0327	5.24€	-	0.13€
Booking OPO - PLN	Plutus	Cashback	17/01/2024	0.3383	55.48€	-	1.35€
Curve - Booking	Curve	Cashback	16/01/2024	-	-	£0.48	0.57€
Curve - Booking	Curve	Cashback	16/01/2024	-	-	£0.48	0.57€
AttaPoll	PayPal	Surveys	15/01/2024	-	-	-	3.29€
Curve - Cashback	Curve	Cashback	15/01/2024	-	-	£5.00	5.90€
Santander	Santander	Cashback	15/01/2024	-	-	-	15.28€
Vip Inn Berna - PLN	Plutus	Cashback	12/01/2024	0.0256	4.00€	-	0.10€
Rentalcars - PLN	Plutus	Cashback	12/01/2024	2.2730	359.89€	-	9.09€
Parrila Vasco - PLN	Plutus	Cashback	12/01/2024	0.0635	9.90€	-	0.25€
Booking - PLN	Plutus	Cashback	11/01/2024	0.2836	44.99€	-	1.13€
Plutus	Plutus	Cashback	11/01/2024	2.0000	-	-	8.00€
AttaPoll	PayPal	Surveys	10/01/2024	-	-	-	3.10€
Plutus	M - Plutus	Cashback	10/01/2024	-	-	-	-4.99€
Curve	M - Curve	Cashback	09/01/2024	-	-	-	-9.99€
AttaPoll	PayPal	Surveys	05/01/2024	-	-	-	3.33€
beRuby - Piti	PayPal	Surveys	02/01/2024	-	-	-	10.00€
`;

const sanitizeRaw = (input) => input.replace(/€(?=[A-Za-zÀ-ÿ])/g, "€\n");

const parseEuroAmount = (value) => {
  const raw = String(value ?? "").replace(/\s/g, "").replace(/[€$£]/g, "");
  if (!raw) return NaN;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;
  if (hasComma && hasDot) {
    const decimalSeparator = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = raw.split(thousandSeparator).join("");
    if (decimalSeparator === ",") normalized = normalized.replace(",", ".");
  } else if (hasComma) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = raw.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};

const toIsoDate = (value) => {
  const [day, month, year] = String(value).split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const normalizeKind = (value) => {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "surveys") return "survey";
  if (normalized === "cashback") return "cashback";
  if (normalized === "others") return "social_media";
  return null;
};

const normalizeProvider = (value) => {
  const provider = String(value ?? "").trim();
  return provider || null;
};

const buildKey = ({ title, provider, kind, date, amountEur, notes }) =>
  `${title}__${provider || ""}__${kind}__${date}__${amountEur.toFixed(2)}__${notes || ""}`;

const deterministicId = (key) => `import-history-${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;

const lines = sanitizeRaw(rawData)
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const parsedRows = [];
const seenInput = new Set();

for (const line of lines) {
  const columns = line.split("\t");
  if (columns.length < 4) continue;

  const [titleRaw, providerRaw, kindRaw, dateRaw] = columns;
  const title = String(titleRaw ?? "").trim();
  const provider = normalizeProvider(providerRaw);
  const normalizedKind = normalizeKind(kindRaw);
  const date = toIsoDate(dateRaw);
  const amountEur = parseEuroAmount(columns.at(-1));

  if (!title || !normalizedKind || !date || !Number.isFinite(amountEur)) {
    continue;
  }

  const notes = normalizedKind === "social_media" ? SOCIAL_MEDIA_NOTE_PREFIX : null;
  const dbKind = normalizedKind === "social_media" ? "survey" : normalizedKind;
  const key = buildKey({ title, provider, kind: dbKind, date, amountEur, notes });
  if (seenInput.has(key)) continue;
  seenInput.add(key);

  parsedRows.push({
    id: deterministicId(key),
    title,
    provider,
    kind: dbKind,
    date,
    amount_eur: amountEur,
    crypto_asset: null,
    crypto_units: null,
    spot_eur_at_earned: null,
    notes,
    created_at: new Date(`${date}T12:00:00.000Z`).toISOString(),
    updated_at: new Date().toISOString(),
    __key: key,
  });
}

const { data: existing, error: loadError } = await supabase
  .from("portfolio_earnings")
  .select("title, provider, kind, date, amount_eur, notes");

if (loadError) {
  console.error("Failed to load existing earnings:", loadError.message);
  process.exit(1);
}

const existingKeys = new Set(
  (existing ?? []).map((row) =>
    buildKey({
      title: String(row.title ?? "").trim(),
      provider: row.provider ? String(row.provider).trim() : null,
      kind: String(row.kind ?? "").trim(),
      date: String(row.date ?? "").trim(),
      amountEur: Number(row.amount_eur) || 0,
      notes: row.notes ? String(row.notes).trim() : null,
    }),
  ),
);

const toInsert = parsedRows
  .filter((row) => !existingKeys.has(row.__key))
  .map(({ __key, ...row }) => row);

if (!toInsert.length) {
  console.log(`No new earnings to import. Parsed ${parsedRows.length} unique rows, all already exist in DB.`);
  process.exit(0);
}

const { error: upsertError } = await supabase
  .from("portfolio_earnings")
  .upsert(toInsert, { onConflict: "id" });

if (upsertError) {
  console.error("Import failed:", upsertError.message);
  process.exit(1);
}

const countByYear = parsedRows.reduce((acc, row) => {
  const year = row.date.slice(0, 4);
  acc[year] = (acc[year] ?? 0) + 1;
  return acc;
}, {});

console.log(`✅ Imported ${toInsert.length} new earnings (${parsedRows.length} unique rows parsed).`);
console.log("📊 Parsed rows by year:", countByYear);
console.log("📊 New rows inserted by year:", toInsert.reduce((acc, row) => {
  const year = row.date.slice(0, 4);
  acc[year] = (acc[year] ?? 0) + 1;
  return acc;
}, {}));
