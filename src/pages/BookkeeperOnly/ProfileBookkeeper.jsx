import ProfilePageBase from "../ProfileDetails/ProfileBase";
import { barChartOutline, documentTextOutline, chatbubbleOutline, logOutOutline, homeOutline, personOutline, menuOutline, chevronForwardOutline } from "ionicons/icons";

function ProfileBookkeeper() {
  return (
    <ProfilePageBase
      menuItems={[
        { label: "Client List History", link: "/current-computation", icon: documentTextOutline },
        { label: "Compute Client Staff Data", link: "/computation-history", icon: barChartOutline },
        { label: "Inquiry", link: "/bookkeeper-inquiry-forum", icon: chatbubbleOutline },
        { logoutIcon: logOutOutline }
      ]}
      editButtons={{
        personal: "bookkeeper-view-personal-details",
        work: "bookkeeper-view-work-details",
        icon: chevronForwardOutline,
        personalLabel: "View personal details",
        workLabel: "View work details"
      }}
      footerLinks={{
        home: "/home-bookkeeper",
        profile: "/profile--bookkeeper",
        homeIcon: homeOutline,
        profileIcon: personOutline,
        menuIcon: menuOutline
      }}
    />
  );
}

export default ProfileBookkeeper;
