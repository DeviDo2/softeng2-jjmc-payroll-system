import ProfilePageBase from "../ProfileDetails/ProfileBase";
import { barChartOutline, documentTextOutline, chatbubbleOutline, playBackOutline, logOutOutline, homeOutline, personOutline, menuOutline, chevronForwardOutline } from "ionicons/icons";

function ProfileClientStaff() {
  return (
    <ProfilePageBase
      menuItems={[
        { label: "Current computation", link: "/current-computation", icon: barChartOutline },
        { label: "Computation history", link: "/computation-history", icon: documentTextOutline },
        { label: "Inquiry", link: "/inquiry", icon: chatbubbleOutline },
        { label: "Tutorials", link: "/tutorials", icon: playBackOutline },
        { logoutIcon: logOutOutline }
      ]}
      editButtons={{
        personal: "edit-personal-details",
        work: "edit-work-details",
        icon: chevronForwardOutline,
        personalLabel: "Edit personal details",
        workLabel: "Edit work details"
      }}
      footerLinks={{
        home: "/home-client-staff",
        profile: "/profile--client-staff",
        homeIcon: homeOutline,
        profileIcon: personOutline,
        menuIcon: menuOutline
      }}
    />
  );
}

export default ProfileClientStaff;
