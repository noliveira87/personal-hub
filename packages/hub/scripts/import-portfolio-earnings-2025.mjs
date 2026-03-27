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

const rawData = String.raw`MultiPolls	PayPal	Surveys	31/12/2025	-	-	-	7.00€
Coupert	Vale	Surveys	31/12/2025		-	-	6.00€
Top Surveys	PayPal	Surveys	31/12/2025	-	-	-	1.00€
HeyCash	PayPal	Surveys	31/12/2025	-	-	-	1.00€
AttaPoll	PayPal	Surveys	31/12/2025	-	-	-	14.55€
EarnStar	PayPal	Surveys	31/12/2025	-	-	-	37.00€
Amazon	Curve	Cashback	30/12/2025	-	-	£0.51	0.60€
Booking	Curve	Cashback	29/12/2025	-	-	£1.92	2.27€
Leroy Merlin	Curve	Cashback	28/12/2025	-	-	£0.09	0.11€
Leroy Merlin	Curve	Cashback	27/12/2025	-	-	£0.06	0.07€
YouTube	Revolut	Others	23/12/2025	-	-	-	5.00€
WFP	Curve	Cashback	20/12/2025	-	-	£1.22	1.44€
Unibanco	Vale	Others	18/12/2025	-	-	-	40.00€
Radar Consumo	Vale	Others	18/12/2025	-	-	-	10.00€
Radar Consumo	Vale	Others	18/12/2025	-	-	-	10.00€
Continente	Curve	Cashback	18/12/2025	-	-	£0.07	0.08€
Bybit	ByBit	Cashback	17/12/2025		-	-	25.00€
Bybit	ByBit	Cashback	17/12/2025		-	-	25.00€
Continente	Curve	Cashback	16/12/2025	-	-	£0.07	0.08€
Amazon	LetyShops	Cashback	14/12/2025	-	-	-	4.83€
Amazon	LetyShops	Cashback	14/12/2025	-	-	-	11.54€
Continente	Curve	Cashback	12/12/2025	-	-	£0.43	0.51€
Amazon	Curve	Cashback	11/12/2025	-	-	£1.55	1.83€
Bybit	ByBit	Cashback	09/12/2025		-	-	25.00€
Mercadona	Curve	Cashback	05/12/2025	-	-	£0.18	0.21€
AC Hotel by Marriott Bella Sky Copenhagen	Curve	Cashback	04/12/2025	-	-	£5.51	6.50€
Amazon	LetyShops	Cashback	04/12/2025	-	-	-	0.81€
Amazon	LetyShops	Cashback	04/12/2025	-	-	-	14.81€
Bybit	ByBit	Cashback	02/12/2025		-	-	25.00€
EarnStar	PayPal	Surveys	30/11/2025	-	-	-	8.32€
Coupert	Vale	Surveys	30/11/2025		-	-	10.00€
Top Surveys	PayPal	Surveys	30/11/2025	-	-	-	2.00€
PrimeOpinion	Revolut	Surveys	30/11/2025	-	-	-	2.00€
HeyCash	PayPal	Surveys	30/11/2025	-	-	-	3.00€
AttaPoll	PayPal	Surveys	30/11/2025	-	-	-	14.02€
TikTok	Revolut	Others	30/11/2025	-	-	-	5.00€
beRuby	PayPal	Surveys	30/11/2025	-	-	-	10.00€
Bybit	ByBit	Cashback	28/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.14€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	1.43€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.95€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.63€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.52€
TikTok	Revolut	Others	21/11/2025	-	-	-	10.00€
YouTube	Vale	Others	17/11/2025	-	-	-	8.00€
WhatYouExpect	Vale	Surveys	07/11/2025		-	-	5.00€
WhatYouExpect	Vale	Surveys	04/11/2025		-	-	5.00€
PrimeOpinion	Revolut	Surveys	31/10/2025	-	-	-	1.00€
AttaPoll	PayPal	Surveys	31/10/2025	-	-	-	16.18€
AttaPoll	PayPal	Surveys	31/10/2025	-	-	-	11.85€
HeyCash	PayPal	Surveys	31/10/2025	-	-	-	2.00€
MultiPolls	PayPal	Surveys	31/10/2025	-	-	-	7.00€
EarnStar	PayPal	Surveys	31/10/2025	-	-	-	10.09€
TEMU	LetyShops	Cashback	27/10/2025	-	-	-	1.53€
Amazon	LetyShops	Cashback	25/10/2025	-	-	-	15.65€
Amazon	LetyShops	Cashback	23/10/2025	-	-	-	1.03€
Amazon	LetyShops	Cashback	23/10/2025	-	-	-	0.32€
A Saideira	Curve	Cashback	20/10/2025	-	-	£0.74	0.87€
Tymrest	Cetelem	Cashback	19/10/2025	-	18.40€	-	0.55€
Bleap Quica	Bleap	Cashback	17/10/2025	-	-	$10.00	8.80€
Amazon	LetyShops	Cashback	17/10/2025	-	-	-	0.29€
Amazon	LetyShops	Cashback	17/10/2025	-	-	-	4.16€
Wild Estimate	Cetelem	Cashback	16/10/2025	-	35.65€	-	1.07€
SHEIN	Vale	Others	16/10/2025	-	-	-	3.00€
Mercadona	Cetelem	Cashback	14/10/2025	-	9.04€	-	0.27€
Questionários Online	Vale	Surveys	13/10/2025	-	-	-	15.00€
Bitoque No Ponto	Cetelem	Cashback	10/10/2025	-	10.10€	-	0.30€
Instagram	Vale	Others	10/10/2025	-	-	-	14.00€
Mercadona	Cetelem	Cashback	08/10/2025	-	11.25€	-	0.34€
Sabores Mondego	Cetelem	Cashback	03/10/2025	-	10.10€	-	0.30€
Continente	Cetelem	Cashback	03/10/2025	-	34.09€	-	1.02€
Amazon	LetyShops	Cashback	03/10/2025	-	-	-	5.00€
Top Surveys	PayPal	Surveys	02/10/2025	-	-	-	5.00€
Booking	Bleap	Cashback	01/10/2025	-	-	$10.00	8.80€
Bleap Quica	Bleap	Cashback	30/09/2025	-	-	$10.00	8.80€
AttaPoll	PayPal	Surveys	30/09/2025	-	-	-	5.54€
PrimeOpinion	Revolut	Surveys	30/09/2025	-	-	-	1.00€
AttaPoll	PayPal	Surveys	30/09/2025	-	-	-	5.64€
HeyCash	PayPal	Surveys	30/09/2025	-	-	-	1.00€
EarnStar	PayPal	Surveys	30/09/2025	-	-	-	2.00€
SHEIN	MBWay	Others	30/09/2025	-	-	-	11.00€
Continente	Cetelem	Cashback	28/09/2025	-	59.27€	-	1.78€
Campanhas	Vale	Others	25/09/2025	-	-	-	23.00€
Radar Consumo	Vale	Others	25/09/2025	-	-	-	5.00€
Radar Consumo	Vale	Others	25/09/2025	-	-	-	5.00€
Nicequest - Amazon	Vale	Surveys	24/09/2025	-	-	-	5.00€
A Saideira	Curve	Cashback	14/09/2025	-	-	£0.32	0.38€
Baianinho	Curve	Cashback	14/09/2025	-	-	£0.04	0.05€
Tubaraofotografo	Curve	Cashback	14/09/2025	-	-	£0.03	0.04€
Aipo E Aipim	Curve	Cashback	14/09/2025	-	-	£0.27	0.32€
Vagalume NSC	Curve	Cashback	14/09/2025	-	-	£0.07	0.08€
Na Brasa Columbia	Curve	Cashback	14/09/2025	-	-	£0.14	0.17€
Lojas Americanas	Curve	Cashback	14/09/2025	-	-	£0.08	0.09€
Bela Ferraz Cosmeticos	Curve	Cashback	14/09/2025	-	-	£0.05	0.06€
Banca do Moacir	Curve	Cashback	14/09/2025	-	-	£0.06	0.07€
Carioca	Curve	Cashback	13/09/2025	-	-	£0.08	0.09€
Drogaria Venancio	Curve	Cashback	13/09/2025	-	-	£0.02	0.02€
K08 Bar E Lanchonete	Curve	Cashback	13/09/2025	-	-	£0.26	0.31€
Metro Rj	Curve	Cashback	13/09/2025	-	-	£0.01	0.01€
Kamal Kalaoun	Curve	Cashback	12/09/2025	-	-	£0.28	0.33€
Metro Rj	Curve	Cashback	12/09/2025	-	-	£0.01	0.01€
Cafe E Bar Azul	Curve	Cashback	12/09/2025	-	-	£0.12	0.14€
Metro Rj	Curve	Cashback	12/09/2025	-	-	£0.01	0.01€
Calcados Levani	Curve	Cashback	12/09/2025	-	-	£0.19	0.22€
Beleza por 10 C	Curve	Cashback	12/09/2025	-	-	£0.46	0.54€
Metro Rj	Curve	Cashback	11/09/2025	-	-	£0.01	0.01€
Mcgv	Curve	Cashback	11/09/2025	-	-	£0.05	0.06€
Bondinho Pao	Curve	Cashback	11/09/2025	-	-	£0.27	0.32€
Bondinho Pao	Curve	Cashback	11/09/2025	-	-	£0.27	0.32€
Zona Sul Fl 26	Curve	Cashback	10/09/2025	-	-	£0.13	0.15€
Na Brasa Columbia	Curve	Cashback	10/09/2025	-	-	£0.04	0.05€
Clube Melissa	Curve	Cashback	10/09/2025	-	-	£0.61	0.72€
Metro Rj	Curve	Cashback	10/09/2025	-	-	£0.01	0.01€
Oggi Pizza	Curve	Cashback	09/09/2025	-	-	£0.37	0.44€
Kamal Kalaoun	Curve	Cashback	09/09/2025	-	-	£0.16	0.19€
Yes Presentes	Curve	Cashback	09/09/2025	-	-	£0.04	0.05€
Reizinho	Curve	Cashback	09/09/2025	-	-	£0.06	0.07€
Metro Rj	Curve	Cashback	09/09/2025	-	-	£0.01	0.01€
Frogpay	Curve	Cashback	09/09/2025	-	-	£0.03	0.04€
Metro Rj	Curve	Cashback	09/09/2025	-	-	£0.01	0.01€
Toca do Pe	Curve	Cashback	09/09/2025	-	-	£0.05	0.06€
Toca do Pe	Curve	Cashback	09/09/2025	-	-	£0.15	0.18€
Calcados Levani	Curve	Cashback	09/09/2025	-	-	£0.12	0.14€
Metro Rj	Curve	Cashback	09/09/2025	-	-	£0.01	0.01€
Lojas Americanas	Curve	Cashback	07/09/2025	-	-	£0.01	0.01€
Airalo	Curve	Cashback	07/09/2025	-	-	£0.19	0.22€
Bar E Restaurante Imac	Curve	Cashback	06/09/2025	-	-	£0.04	0.05€
Lanchonete Rufos	Curve	Cashback	06/09/2025	-	-	£0.10	0.12€
Botequimdapraia	Curve	Cashback	06/09/2025	-	-	£0.03	0.04€
Rio Farma	Curve	Cashback	06/09/2025	-	-	£0.03	0.04€
JOOM	MBWay	Others	04/09/2025	-	-	-	8.00€
EB	Bleap	Cashback	04/09/2025	-	-	$1.77	1.56€
WhatYouExpect	Vale	Surveys	04/09/2025		-	-	5.00€
Rejuvemed	Bleap	Cashback	02/09/2025	-	-	$7.73	6.80€
CP	Bleap	Cashback	02/09/2025	-	-	$0.50	0.44€
beRuby	PayPal	Surveys	02/09/2025	-	-	-	10.00€
Cash Giraffe	PayPal	Surveys	31/08/2025	-	-	$0.35	0.31€
HeyCash	PayPal	Surveys	31/08/2025	-	-	-	2.00€
HeyCash	PayPal	Surveys	31/08/2025	-	-	-	3.00€
MultiPolls	PayPal	Surveys	31/08/2025	-	-	-	7.00€
EarnStar	PayPal	Surveys	31/08/2025	-	-	-	8.00€
AttaPoll	PayPal	Surveys	31/08/2025	-	-	-	7.99€
AttaPoll	PayPal	Surveys	31/08/2025	-	-	-	8.74€
Bleap Quica	Bleap	Cashback	31/08/2025	-	-	$10.00	8.80€
beRuby	PayPal	Surveys	29/08/2025	-	-	-	10.00€
Galp - Amazon	Vale	Others	26/08/2025	-	-	-	49.90€
Domino's Pizza	Cetelem	Cashback	23/08/2025	-	17.82€	-	0.53€
TripAdvisor	MBWay	Others	22/08/2025	-	-	-	10.00€
AliExpress	LetyShops	Cashback	20/08/2025	-	-	-	0.10€
Temu	LetyShops	Cashback	19/08/2025	-	-	-	1.11€
Temu	Bleap	Cashback	17/08/2025	-	-	$1.65	1.45€
Izakaya	Bleap	Cashback	17/08/2025	-	-	$0.94	0.83€
Continente	Bleap	Cashback	17/08/2025	-	-	$0.38	0.33€
SumUp	Bleap	Cashback	15/08/2025	-	-	$0.21	0.18€
Vitaminas	Bleap	Cashback	15/08/2025	-	-	$0.27	0.24€
Continente	Bleap	Cashback	15/08/2025	-	-	$2.48	2.18€
Praxis	Bleap	Cashback	14/08/2025	-	-	$1.94	1.71€
HOMA	Bleap	Cashback	13/08/2025	-	-	$0.17	0.15€
HOMA	Bleap	Cashback	13/08/2025	-	-	$0.63	0.55€
Inquérito Mastercard	Vale	Surveys	11/08/2025	-	-	-	20.00€
Mercadona	Bleap	Cashback	10/08/2025	-	-	$0.40	0.35€
SumUp	Bleap	Cashback	08/08/2025	-	-	$0.20	0.18€
Vitaminas	Bleap	Cashback	08/08/2025	-	-	$0.46	0.40€
Nicequest - Amazon	Vale	Surveys	08/08/2025	-	-	-	5.00€
Block Code UAB	Cetelem	Cashback	04/08/2025	-	6.99€	-	0.21€
Mania	Bleap	Cashback	03/08/2025	-	-	$0.27	0.24€
Continente	Cetelem	Cashback	01/08/2025	-	17.68€	-	0.53€
PrimeOpinion	Revolut	Surveys	31/07/2025	-	-	-	4.00€
AttaPoll	PayPal	Surveys	31/07/2025	-	-	-	8.70€
AttaPoll	PayPal	Surveys	31/07/2025	-	-	-	7.02€
HeyCash	PayPal	Surveys	31/07/2025	-	-	-	5.00€
MultiPolls	PayPal	Surveys	31/07/2025	-	-	-	7.00€
EarnStar	PayPal	Surveys	31/07/2025	-	-	-	5.00€
Bleap Quica	Bleap	Cashback	31/07/2025	-	-	$8.71	7.66€
TEMU	LetyShops	Cashback	28/07/2025	-	-	-	0.43€
Instagram	MBWay	Others	25/07/2025	-	-	-	11.00€
TradeRepublic	Vale	Others	25/07/2025	-	-	-	10.00€
Continente	Cetelem	Cashback	21/07/2025	-	60.06€	-	1.80€
Restaurante Olaias	Cetelem	Cashback	19/07/2025	-	74.00€	-	2.22€
McDonalds	Cetelem	Cashback	19/07/2025	-	0.85€	-	0.03€
Flights Booking	Bleap	Cashback	15/07/2025	-	1,142.61€	$7.55	6.64€
BCM Bricolagem	Curve	Cashback	15/07/2025	-	-	£1.12	1.32€
EarnStar	PayPal	Surveys	14/07/2025	-	-	-	5.00€
Amazon	LetyShops	Cashback	14/07/2025	-	-	-	1.07€
Celeiro	Cetelem	Cashback	14/07/2025	-	33.38€	-	1.00€
Jet 7 5	Cetelem	Cashback	13/07/2025	-	30.00€	-	0.90€
Gallant Station	Cetelem	Cashback	13/07/2025	-	3.60€	-	0.11€
Dominos Pizza	Cetelem	Cashback	12/07/2025	-	27.50€	-	0.83€
Barbearia São José	Bleap	Cashback	11/07/2025	-	15.00€	$0.35	0.31€
Tomatino	Cetelem	Cashback	11/07/2025	-	17.65€	-	0.53€
Prozis	Bleap	Cashback	10/07/2025	-	89.98€	$2.10	1.85€
Amazon	LetyShops	Cashback	09/07/2025	-	-	-	3.80€
Mercadona	Cetelem	Cashback	08/07/2025	-	53.18€	-	1.60€
Mercadona	Curve	Cashback	08/07/2025	-	-	£0.46	0.54€
Amazon	Curve	Cashback	08/07/2025	-	-	£2.66	3.14€
Continente	Cetelem	Cashback	07/07/2025	-	41.25€	-	1.24€
Continente	Curve	Cashback	07/07/2025	-	-	£0.36	0.42€
Cash Giraffe	PayPal	Surveys	06/07/2025	-	-	-	0.50€
Nicequest - Amazon	Vale	Surveys	04/07/2025	-	-	-	5.00€
Amazon	Curve	Cashback	03/07/2025	-	-	£0.73	0.86€
AttaPoll	PayPal	Surveys	30/06/2025	-	-	-	8.09€
AttaPoll	PayPal	Surveys	30/06/2025	-	-	-	10.32€
HeyCash	PayPal	Surveys	30/06/2025	-	-	-	9.00€
Bleap Quica	Bleap	Cashback	30/06/2025	-	-	$8.82	7.76€
TradeRepublic	Vale	Others	30/06/2025	-	-	-	10.00€
beRuby	PayPal	Surveys	27/06/2025	-	-	-	10.00€
Shein	LetyShops	Cashback	27/06/2025	-	-	-	1.14€
TEMU	LetyShops	Cashback	26/06/2025	-	-	-	0.20€
Continente	Curve	Cashback	20/06/2025	-	-	£0.02	0.02€
Continente	Cetelem	Cashback	20/06/2025	-	2.04€	-	0.06€
Nicequest - Amazon	Vale	Surveys	18/06/2025	-	-	-	5.00€
AliExpress	LetyShops	Cashback	18/06/2025	-	-	-	0.14€
AliExpress	LetyShops	Cashback	18/06/2025	-	-	-	0.09€
AliExpress	LetyShops	Cashback	18/06/2025	-	-	-	0.14€
Booking	Curve	Cashback	16/06/2025	-	-	£10.00	11.80€
BCM Bricolagem	Curve	Cashback	15/06/2025	-	-	£2.41	2.84€
Continente	Curve	Cashback	15/06/2025	-	-	£0.38	0.45€
Continente	Cetelem	Cashback	15/06/2025	-	44.27€	-	1.33€
Continente	Cetelem	Cashback	13/06/2025	-	53.64€	-	1.61€
Continente	Curve	Cashback	13/06/2025	-	-	£0.46	0.54€
About You	LetyShops	Cashback	11/06/2025	-	-	-	5.84€
Flights Booking	Bleap	Cashback	11/06/2025	-	683.38€	$9.29	8.18€
CL	Bleap	Cashback	05/06/2025	-	31.50€	$0.71	0.62€
Sacoor Brothers	Cetelem	Cashback	05/06/2025	-	39.65€	-	1.19€
BoutiquedeOpiniões	Vale	Surveys	04/06/2025		-	-	20.00€
MultiPolls	PayPal	Surveys	04/06/2025	-	-	-	7.00€
Moinho Velho	Cetelem	Cashback	03/06/2025	-	40.47€	-	1.21€
Bleap Quica	Bleap	Cashback	31/05/2025	-	-	$10.00	8.80€
HeyCash	PayPal	Surveys	31/05/2025	-	-	-	4.00€
AttaPoll	PayPal	Surveys	31/05/2025	-	-	-	11.80€
AttaPoll	PayPal	Surveys	31/05/2025	-	-	-	7.04€
Mercadona	Curve	Cashback	31/05/2025	-	-	£0.19	0.22€
Mercadona	Cetelem	Cashback	31/05/2025	-	21.98€	-	0.66€
Continente	Cetelem	Cashback	30/05/2025	-	48.73€	-	1.46€
Portugalia	Cetelem	Cashback	30/05/2025	-	10.50€	-	0.32€
Continente	Curve	Cashback	30/05/2025	-	-	£0.41	0.48€
beRuby	PayPal	Surveys	30/05/2025	-	-	-	10.00€
Nicequest - Amazon	Vale	Surveys	28/05/2025	-	-	-	5.00€
PrimeOpinion	PayPal	Surveys	27/05/2025	-	-	-	5.00€
TEMU	LetyShops	Cashback	27/05/2025	-	-	-	0.78€
Amazon	LetyShops	Cashback	26/05/2025	-	-	-	1.24€
Amazon	LetyShops	Cashback	26/05/2025	-	-	-	0.17€
Amazon	LetyShops	Cashback	26/05/2025	-	-	-	0.94€
Amazon	LetyShops	Cashback	26/05/2025	-	-	-	0.82€
Leroy Merlin	Curve	Cashback	25/05/2025	-	-	£0.24	0.28€
Amazon	LetyShops	Cashback	25/05/2025	-	-	-	4.51€
Moinho Velho	Cetelem	Cashback	25/05/2025	-	10.35€	-	0.31€
Continente	Cetelem	Cashback	25/05/2025	-	90.74€	-	2.72€
Continente	Curve	Cashback	24/05/2025	-	-	£0.76	0.90€
Plaza Bistro Figueira	Cetelem	Cashback	23/05/2025	-	45.20€	-	1.36€
Poll Pay	PayPal 	Surveys	22/05/2025	-	-	-	5.00€
Uber Eats	Cetelem	Cashback	18/05/2025	-	20.91€	-	0.63€
Mercadona	Cetelem	Cashback	17/05/2025	-	62.51€	-	1.88€
Mercadona	Curve	Cashback	17/05/2025	-	-	£0.53	0.63€
Nicequest - Amazon	Vale	Surveys	16/05/2025	-	-	-	5.00€
Continente	Cetelem	Cashback	13/05/2025	-	99.47€	-	2.98€
Computador Pintor	MBWay	Others	10/05/2025	-	-	-	50.00€
Continente	Curve	Cashback	09/05/2025	-	-	£0.85	1.00€
Amazon	LetyShops	Cashback	02/05/2025	-	-	-	3.45€
TradeInn	Bleap	Cashback	01/05/2025	-	81.97€	$1.85	1.63€
JYSK	Bleap	Cashback	01/05/2025	-	150.00€	$3.39	2.98€
AliExpress	Bleap	Cashback	01/05/2025	-	17.27€	$0.39	0.34€
Feira dos Colchões	Bleap	Cashback	01/05/2025	-	657.80€	$2.37	2.09€
AliExpress	LetyShops	Cashback	01/05/2025	-	-	-	0.15€
AliExpress	LetyShops	Cashback	01/05/2025	-	-	-	0.13€
AliExpress	LetyShops	Cashback	01/05/2025	-	-	-	0.39€
Amazon	LetyShops	Cashback	01/05/2025	-	-	-	0.65€
Wells Coimbra	Bleap	Cashback	01/05/2025	-	49.41€	$1.12	0.99€
Barbearia	Bleap	Cashback	01/05/2025	-	15.00€	$0.33	0.29€
Leroy Merlin	Bleap	Cashback	01/05/2025	-	24.38€	$0.55	0.48€
HeyCash	PayPal	Surveys	30/04/2025	-	-	-	3.00€
AttaPoll	PayPal	Surveys	30/04/2025	-	-	-	5.63€
AttaPoll	PayPal	Surveys	30/04/2025	-	-	-	3.09€
Amazon	Curve	Cashback	30/04/2025	-	-	£0.17	0.20€
Areas Portugal	Cetelem	Cashback	29/04/2025	-	3.00€	-	0.09€
Continente	Bleap	Cashback	28/04/2025	-	214.17€	$4.26	3.75€
Pluricosmetica	Bleap	Cashback	27/04/2025	-	4.25€	$0.09	0.07€
LIDL	Cetelem	Cashback	26/04/2025	-	62.62€	-	1.88€
Leroy Merlin	Curve	Cashback	25/04/2025	-		£0.12	0.14€
Amazon	LetyShops	Cashback	24/04/2025	-	-	-	1.34€
Laser	Bleap	Cashback	23/04/2025	-	240.99€	$5.48	4.82€
Amazon	Curve	Cashback	23/04/2025	-	235.96€	£1.00	1.18€
Curve - Oferta	Curve	Cashback	22/04/2025	-	-	£5.00	5.90€
Amazon	LetyShops	Cashback	22/04/2025	-	-	-	0.24€
Nicequest - Amazon	Vale	Surveys	21/04/2025	-	-	-	5€
Continente	Cetelem	Cashback	19/04/2025	-	11.92€	-	0.36€
Continente	Curve	Cashback	19/04/2025	-		£0.10	0.12€
SHEIN	LetyShops	Cashback	17/04/2025	-	-	-	1.37€
Continente	Curve	Cashback	17/04/2025	-		£0.30	0.35€
Amazon	Curve	Cashback	17/04/2025	-	81.48€	£0.70	0.83€
Amazon	Curve	Cashback	17/04/2025	-	19.24€	£0.14	0.17€
Booking	MBWay	Others	17/04/2025	-	-	-	3.00€
YouGov	TB	Surveys	17/04/2025	-	-	-	25.00€
Vita Forum Coimbra	Cetelem	Cashback	15/04/2025	-	13.45€	-	0.40€
Akibaoo 7th	Curve	Cashback	14/04/2025	-	11.59€	£0.10	0.12€
Veloce	Curve	Cashback	14/04/2025	-	1.86€	£0.02	0.02€
Akky	Curve	Cashback	14/04/2025	-	32.60€	£0.28	0.33€
Ramutara Akibaraten	Curve	Cashback	14/04/2025	-	12.28€	£0.11	0.13€
Suica	Curve	Cashback	14/04/2025	-	18.60€	£0.16	0.19€
Donquijote Akihabara	Curve	Cashback	14/04/2025	-	12.62€	£0.11	0.13€
Suica	Curve	Cashback	14/04/2025	-	2.79€	£0.02	0.02€
Shinjiyukueki	Curve	Cashback	13/04/2025	-	13.64€	£0.12	0.14€
Okame	Curve	Cashback	12/04/2025	-	51.46€	£0.45	0.53€
Suica	Curve	Cashback	12/04/2025	-	6.20€	£0.05	0.06€
Picnicrand	Curve	Cashback	12/04/2025	-	6.14€	£0.05	0.06€
Sq*ipeople	Curve	Cashback	12/04/2025	-	5.58€	£0.05	0.06€
Sq*chermsidesandwich	Curve	Cashback	12/04/2025	-	25.11€	£0.22	0.26€
Matsumotokiyoshi	Curve	Cashback	12/04/2025	-	2.59€	£0.02	0.03€
Matsumotokiyoshi	Curve	Cashback	12/04/2025	-	68.06€	£0.60	0.71€
Familymart	Curve	Cashback	12/04/2025	-	1.14€	£0.01	0.01€
AliExpress	LetyShops	Cashback	12/04/2025	-	-	-	0.05€
AliExpress	LetyShops	Cashback	12/04/2025	-	-	-	0.05€
Suica	Curve	Cashback	11/04/2025	-	6.27€	£0.05	0.06€
Tokyodome City Laqua	Curve	Cashback	11/04/2025	-	5.64€	£0.05	0.06€
Tokyodome City Laqua	Curve	Cashback	11/04/2025	-	8.91€	£0.08	0.09€
Tokyodome City Laqua	Curve	Cashback	11/04/2025	-	6.21€	£0.05	0.06€
Koishikawakourakuen	Curve	Cashback	11/04/2025	-	3.76€	£0.03	0.04€
Seven-eleven	Curve	Cashback	11/04/2025	-	11.01€	£0.10	0.12€
Suica	Curve	Cashback	11/04/2025	-	6.27€	£0.05	0.06€
Jr East Shopping Cente	Curve	Cashback	10/04/2025	-	25.21€	£0.22	0.26€
Nihonbashitakashi	Curve	Cashback	10/04/2025	-	9.88€	£0.09	0.11€
Seven-eleven	Curve	Cashback	10/04/2025	-	7.84€	£0.07	0.08€
Rakuto	Curve	Cashback	09/04/2025	-	10.30€	£0.09	0.11€
Rinrokuen	Curve	Cashback	09/04/2025	-	12.48€	£0.11	0.13€
Rakuto	Curve	Cashback	09/04/2025	-	21.62€	£0.19	0.22€
Seven-eleven	Curve	Cashback	09/04/2025	-	8.06€	£0.07	0.08€
Kyobaamu Kiyomi	Curve	Cashback	09/04/2025	-	2.50€	£0.02	0.02€
Sp*here Kiyomizu	Curve	Cashback	09/04/2025	-	4.68€	£0.04	0.05€
Matsumotokiyoshi	Curve	Cashback	09/04/2025	-	6.85€	£0.06	0.07€
Familymart	Curve	Cashback	08/04/2025	-	4.03€	£0.04	0.05€
Lawson	Curve	Cashback	08/04/2025	-	7.62€	£0.07	0.08€
Suica	Curve	Cashback	08/04/2025	-	12.57€	£0.11	0.13€
Sp*benizuru	Curve	Cashback	08/04/2025	-	33.93€	£0.29	0.34€
Brandjungle	Curve	Cashback	08/04/2025	-	501.35€	£4.35	5.13€
Familymart	Curve	Cashback	08/04/2025	-	6.37€	£0.06	0.07€
JRC Smart Ex	Curve	Cashback	08/04/2025	-	167.37€	£1.45	1.71€
JRC Smart Ex	Curve	Cashback	08/04/2025	-	173.02€	£1.50	1.77€
Sococo	Curve	Cashback	08/04/2025	-	8.29€	£0.07	0.08€
Bonjour	Curve	Cashback	07/04/2025	-	14.87€	£0.13	0.15€
Uniqlo	Curve	Cashback	07/04/2025	-	9.43€	£0.08	0.09€
Tokyo Midtown	Curve	Cashback	07/04/2025	-	7.23€	£0.06	0.07€
Ippudo Roppongiten	Curve	Cashback	07/04/2025	-	33.90€	£0.29	0.34€
GIYUKATSU	Curve	Cashback	06/04/2025	-	29.93€	£0.26	0.31€
Ginkado	Curve	Cashback	06/04/2025	-	3.77€	£0.03	0.04€
Lawson	Curve	Cashback	06/04/2025	-	5.41€	£0.05	0.06€
Uobei Shibuya	Curve	Cashback	05/04/2025	-	17.48€	£0.15	0.18€
Sq*yurinan	Curve	Cashback	05/04/2025	-	3.58€	£0.03	0.04€
Picnicrand	Curve	Cashback	05/04/2025	-	4.84€	£0.04	0.05€
Roppongi Hills	Curve	Cashback	05/04/2025	-	12.46€	£0.11	0.13€
Roppongi Hills	Curve	Cashback	05/04/2025	-	12.00€	£0.10	0.12€
Matsumotokiyoshi	Curve	Cashback	05/04/2025	-	6.92€	£0.06	0.07€
Sp*roppongi	Curve	Cashback	04/04/2025	-	8.48€	£0.07	0.08€
Familymart	Curve	Cashback	04/04/2025	-	6.56€	£0.06	0.07€
Suica	Curve	Cashback	04/04/2025	-	21.83€	£0.19	0.22€
Primor	Bleap	Cashback	02/04/2025	-	7.80€	$0.16	0.14€
AliExpress	LetyShops	Cashback	02/04/2025	-	-	-	0.10€
Curve - Amazon	Curve	Cashback	02/04/2025	-	-	£0.08	0.09€
HeyCash	PayPal	Surveys	31/03/2025	-	-	-	1.00€
AttaPoll	PayPal	Surveys	31/03/2025	-	-	-	3.22€
AttaPoll	PayPal	Surveys	31/03/2025	-	-	-	5.74€
Airalo	LetyShops	Cashback	31/03/2025	-	-	-	0.67€
Amazon	LetyShops	Cashback	31/03/2025	-	-	-	2.04€
Primor	Bleap	Cashback	28/03/2025	-	10.29€	$0.22	0.19€
Curve - Amazon	Curve	Cashback	27/03/2025	-	-	£0.94	1.11€
Curve - Continente	Curve	Cashback	27/03/2025	-	-	£0.09	0.11€
Curve - BCM Bricolage	Curve	Cashback	23/03/2025	-	-	£0.16	0.19€
Tomatino	Cetelem	Cashback	22/03/2025	-	17.30€	-	0.52€
Auchan	Cetelem	Cashback	22/03/2025	-	6.60€	-	0.20€
Domino's Pizza	Cetelem	Cashback	22/03/2025	-	28.67€	-	0.86€
Tomatino	Cetelem	Cashback	22/03/2025	-	9.50€	-	0.29€
McDonalds	Cetelem	Cashback	22/03/2025	-	1.60€	-	0.05€
Sabores da Romeira	Cetelem	Cashback	22/03/2025	-	50.00€	-	1.50€
Primor	Bleap	Cashback	22/03/2025	-	2.20€	$0.04	0.04€
Curve - Continente	Curve	Cashback	22/03/2025	-	-	£0.88	1.04€
Primor	LetyShops	Cashback	20/03/2025	-	-	-	1.14€
AliExpress	Bleap	Cashback	20/03/2025	-	12.25€	$0.26	0.23€
Mercadona	Cetelem	Cashback	20/03/2025	-	15.09€	-	0.45€
AliExpress	LetyShops	Cashback	19/03/2025	-	-	-	0.03€
Amazon	LetyShops	Cashback	19/03/2025	-	-	-	0.64€
Curve - Oferta	Curve	Cashback	18/03/2025	-	-	£5.00	5.90€
AliExpress	LetyShops	Cashback	17/03/2025	-	-	-	0.01€
AliExpress	LetyShops	Cashback	17/03/2025	-	-	-	0.09€
AliExpress	LetyShops	Cashback	17/03/2025	-	-	-	0.09€
AliExpress	LetyShops	Cashback	17/03/2025	-	-	-	0.06€
Curve - Mercadona	Curve	Cashback	17/03/2025	-	-	£0.13	0.15€
Curve - Amazon	Curve	Cashback	17/03/2025	-	-	£0.02	0.02€
Tomatino	Cetelem	Cashback	14/03/2025	-	18.15€	-	0.54€
Tomatino	Cetelem	Cashback	14/03/2025	-	10.30€	-	0.31€
H3 Fórum	Cetelem	Cashback	14/03/2025	-	10.15€	-	0.30€
Poke Mania Bowls	Cetelem	Cashback	14/03/2025	-	10.45€	-	0.31€
Continente	Cetelem	Cashback	14/03/2025	-	56.06€	-	1.68€
Curve - Continente	Curve	Cashback	14/03/2025	-	-	£0.06	0.07€
Restaurante MA	Cetelem	Cashback	14/03/2025	-	178.00€	-	5.34€
Dominos Pizza	Cetelem	Cashback	14/03/2025	-	23.90€	-	0.72€
Amazon	LetyShops	Cashback	12/03/2025	-	-	-	0.67€
Curve - BCM Bricolage	Curve	Cashback	09/03/2025	-	-	£0.84	0.99€
Curve - PD Mealhada	Curve	Cashback	07/03/2025	-	-	£0.10	0.12€
Curve - PD Mealhada	Curve	Cashback	07/03/2025	-	-	£0.04	0.05€
Curve - Cashwww (Amazon)	Curve	Cashback	06/03/2025	-	-	£0.08	0.09€
Curve - BCM Bricolage	Curve	Cashback	03/03/2025	-	-	£0.15	0.18€
Curve - Continente	Curve	Cashback	02/03/2025	-	-	£0.46	0.54€
AliExpress	LetyShops	Cashback	01/03/2025	-	-	-	0.08€
AliExpress	LetyShops	Cashback	01/03/2025	-	-	-	0.02€
AliExpress	LetyShops	Cashback	01/03/2025	-	-	-	0.24€
AliExpress	LetyShops	Cashback	01/03/2025	-	-	-	0.03€
AliExpress	LetyShops	Cashback	01/03/2025	-	-	-	0.09€
AliExpress	LetyShops	Cashback	01/03/2025	-	-	-	0.27€
Curve - BCM Bricolage	Curve	Cashback	01/03/2025	-	-	£0.30	0.35€
Instagram	MBWay	Others	01/03/2025	-	-	-	13.00€
beRuby	PayPal	Surveys	01/03/2025	-	-	-	10.00€
HeyCash	PayPal	Surveys	28/02/2025	-	-	-	1.00€
HeyCash	PayPal	Surveys	28/02/2025	-	-	-	2.00€
AttaPoll	PayPal	Surveys	28/02/2025	-	-	-	6.79€
AttaPoll	PayPal	Surveys	28/02/2025	-	-	-	3.99€
Poll Pay	PayPal 	Surveys	27/02/2025	-	-	-	5.00€
Curve - Continente	Curve	Cashback	26/02/2025	-	-	£0.01	0.01€
Curve - BCM Bricolage	Curve	Cashback	23/02/2025	-	-	£0.15	0.18€
Curve - BCM Bricolage	Curve	Cashback	22/02/2025	-	-	£0.81	0.96€
Curve - Pingo Doce	Curve	Cashback	20/02/2025	-	-	£0.22	0.26€
Nicequest - Amazon	Vale	Surveys	20/02/2025	-	-	-	5€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.02€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.02€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.04€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.02€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.02€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.02€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.06€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.35€
AliExpress	LetyShops	Cashback	17/02/2025	-	-	-	0.28€
Curve - Pingo Doce	Curve	Cashback	15/02/2025	-	-	£0.08	0.09€
Curve - Mercadona	Curve	Cashback	15/02/2025	-	-	£0.20	0.24€
Curve - Continente	Curve	Cashback	14/02/2025	-	-	£0.25	0.30€
Curve - BCM Bricolage	Curve	Cashback	12/02/2025	-	-	£0.41	0.48€
Miravia PT	LetyShops	Cashback	11/02/2025	-	-	-	0.20€
Miravia PT	LetyShops	Cashback	11/02/2025	-	-	-	0.51€
Miravia PT	LetyShops	Cashback	11/02/2025	-	-	-	0.51€
Miravia PT	LetyShops	Cashback	11/02/2025	-	-	-	0.51€
Curve - Booking	Curve	Cashback	10/02/2025	-	-	£0.45	0.53€
Curve - Continente	Curve	Cashback	09/02/2025	-	-	£0.08	0.09€
Curve - Continente	Curve	Cashback	09/02/2025	-	-	£0.18	0.21€
Curve - Continente	Curve	Cashback	09/02/2025	-	-	£0.17	0.20€
Curve - Continente	Curve	Cashback	09/02/2025	-	-	£0.29	0.34€
Curve - Pingo Doce	Curve	Cashback	07/02/2025	-	-	£0.15	0.18€
Curve - Continente	Curve	Cashback	31/01/2025	-	-	£0.11	0.13€
Amazon	LetyShops	Cashback	31/01/2025	-	-	-	0.76€
HeyCash	PayPal	Surveys	31/01/2025	-	-	-	1.00€
AttaPoll	PayPal	Surveys	30/01/2025	-	-	-	4.97€
AttaPoll	PayPal	Surveys	30/01/2025	-	-	-	4.96€
HeyCash	PayPal	Surveys	30/01/2025	-	-	-	2.00€
MultiPolls	PayPal	Surveys	30/01/2025	-	-	-	7.00€
Nicequest - Amazon	Vale	Surveys	30/01/2025	-	-	-	5€
Curve - MEO	Curve	Cashback	30/01/2025	-	-	£0.37	0.44€
Curve - Booking	Curve	Cashback	26/01/2025	-	-	£0.90	1.06€
Curve - Booking	Curve	Cashback	26/01/2025	-	-	£10.00	11.80€
Curve - Pingo Doce	Curve	Cashback	23/01/2025	-	-	£0.12	0.14€
Curve - LIDL	Curve	Cashback	18/01/2025	-	-	£0.09	0.11€
Curve - Pingo Doce	Curve	Cashback	17/01/2025	-	-	£0.11	0.13€
Curve - Pingo Doce	Curve	Cashback	17/01/2025	-	-	£0.02	0.02€
Curve - Pingo Doce	Curve	Cashback	15/01/2025	-	-	£0.14	0.17€
Curve - Continente	Curve	Cashback	10/01/2025	-	-	£0.23	0.27€
Curve - Continente	Curve	Cashback	10/01/2025	-	-	£0.08	0.09€
beRuby	TB	Surveys	10/01/2025	-	-	-	10.00€
Curve - Pingo Doce	Curve	Cashback	09/01/2025	-	-	£0.13	0.15€
beRuby	PayPal	Surveys	09/01/2025	-	-	-	10.00€
Curve - Pingo Doce	Curve	Cashback	08/01/2025	-	-	£0.04	0.05€
Curve - Pingo Doce	Curve	Cashback	08/01/2025	-	-	£0.06	0.07€
Europcar	LetyShops	Cashback	08/01/2025	-	-	-	5.65€
Booking	MBWay	Others	06/01/2025	-	-	-	5.00€
Booking	MBWay	Others	05/01/2025	-	-	-	10.00€
Booking Cashback	Booking Wallet	Cashback	05/01/2025	-	-	-	4.85€
Curve - Pingo Doce	Curve	Cashback	05/01/2025	-	-	£0.12	0.14€
LetyShops	LetyShops	Cashback	03/01/2025	-	-	-	-0.13€
Curve - Continente	Curve	Cashback	03/01/2025	-	-	£0.03	0.04€
IMDb	MBWay	Others	02/01/2025	-	-	-	22.00€`;

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

const buildKey = ({ title, provider, kind, date, amountEur }) =>
  `${title}__${provider || ""}__${kind}__${date}__${amountEur.toFixed(2)}`;

const deterministicId = (key) => `import-2025-${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;

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
  const provider = String(providerRaw ?? "").trim() || null;
  const kind = normalizeKind(kindRaw);
  const date = toIsoDate(dateRaw);
  const amountEur = parseEuroAmount(columns.at(-1));

  if (!title || !kind || !date || !date.startsWith("2025-") || !Number.isFinite(amountEur)) {
    continue;
  }

  const key = buildKey({ title, provider, kind, date, amountEur });
  if (seenInput.has(key)) continue;
  seenInput.add(key);

  parsedRows.push({
    id: deterministicId(key),
    title,
    provider,
    kind: kind === "social_media" ? "survey" : kind,
    date,
    amount_eur: amountEur,
    crypto_asset: null,
    crypto_units: null,
    spot_eur_at_earned: null,
    notes: kind === "social_media" ? SOCIAL_MEDIA_NOTE_PREFIX : null,
    created_at: new Date(`${date}T12:00:00.000Z`).toISOString(),
    updated_at: new Date().toISOString(),
    __key: key,
  });
}

const { data: existing, error: loadError } = await supabase
  .from("portfolio_earnings")
  .select("title, provider, kind, date, amount_eur");

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
    }),
  ),
);

const toInsert = parsedRows
  .filter((row) => !existingKeys.has(row.__key))
  .map(({ __key, ...row }) => row);

if (!toInsert.length) {
  console.log(`No new 2025 earnings to import. Parsed ${parsedRows.length} unique rows.`);
  process.exit(0);
}

const { error: upsertError } = await supabase
  .from("portfolio_earnings")
  .upsert(toInsert, { onConflict: "id" });

if (upsertError) {
  console.error("Import failed:", upsertError.message);
  process.exit(1);
}

console.log(`Imported ${toInsert.length} new earnings (${parsedRows.length} unique rows parsed from paste).`);
