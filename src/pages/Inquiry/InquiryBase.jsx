import React from "react";

import {
  IonPage,
  IonContent,
  IonImg,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonAccordion,
  IonAccordionGroup,
} from "@ionic/react";

import {
  chevronDownOutline,
} from "ionicons/icons";

import "./InquiryBase.css";
import useAuthRole from "../../hooks/useAuthRole";

import FooterNav from "../../components/FooterNav";

function Inquiry() {
  // 🟢 FIX: get resolvedRole from your hook (or set empty default)
  const { role } = useAuthRole() || { role: "Client-Staff" };

 return (
    <IonPage id="main-content">
      <IonContent fullscreen className="inquiry-content">
          <IonImg
            src="/assets/Gradient-Ellipses.png"
            alt="Background Ellipse"
            className="ellipse-bg"
          />

        <div className="full-height-wrapper" style={{ padding: '16px' }}>
          <div className="inquiry-card-container">
            {/* HEADER – left aligned now */}
            <h1 className="inquiry-title">Inquiry</h1>
            <p className="inquiry-subtitle">
              Check the questions below to get to know our organization.
            </p>

            {/* ACCORDIONS – same width as container */}
            <IonAccordionGroup className="inquiry-accordion">
              {/* Question 1 */}
              <IonAccordion value="question1">
                <IonItem slot="header" className="accordion-header">
                  <IonLabel>
                    <b>What services are being provided by JJMC?</b>
                  </IonLabel>
                  <IonIcon icon={chevronDownOutline} slot="end" />
                </IonItem>
                <IonList style={{ position: 'static' }} slot="content" className="accordion-content">
                  <IonItem>
                    <IonLabel>
                      We provide the following services:
                      <li><b> - Accounting and Bookkeeping</b></li>
                      <li><b> - Tax Services</b></li>
                      <li><b> - Business Consultancy and Registration</b></li>
                      <li><b> - Payroll Services</b></li>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonAccordion>

              {/* Question 2 */}
              <IonAccordion value="question2">
                <IonItem slot="header" className="accordion-header">
                  <IonLabel>
                    <b>Why should we get the services of JJMC? What are the benefits?</b>
                  </IonLabel>
                  <IonIcon icon={chevronDownOutline} slot="end" />
                </IonItem>
                <IonList style={{ position: 'static' }} slot="content" className="accordion-content">
                  <IonItem>
                    <IonLabel>
                      Choosing JJMC allows you to benefit from our
                      <b> expertise and experience </b> in handling accounting
                      and tax matters...
                    </IonLabel>
                  </IonItem>
                </IonList>
              </IonAccordion>
            </IonAccordionGroup>

            {/* GO TO FORUM CARD */}
            <IonCard className="inquiry-card">
              <IonCardContent>
                <h3 className="card-title">Got any questions? Drop them here</h3>
                <IonButton
                  expand="block"
                  className="forum-button"
                  routerLink={`/inquiry-forum-base?role=${role}`}
                >
                  Go to Forum
                </IonButton>
              </IonCardContent>
            </IonCard>
          </div>
        </div>

        
      </IonContent>
      <FooterNav/>
    </IonPage>
);
}

export default Inquiry;
