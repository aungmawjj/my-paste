import axios from "axios";
import { useCallback } from "react";
import { User } from "./model";
import {
  Avatar,
  Text,
  Flex,
  Spacer,
  Icon,
  Image,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
} from "@chakra-ui/react";
import { MdLogout } from "react-icons/md";

type Props = {
  user: User;
};

function TopBar({ user }: Readonly<Props>) {
  const handleLogout = useCallback(() => {
    axios
      .post("/api/auth/logout", null)
      .then(() => {
        window.location.replace("/login");
      })
      .catch(console.error);
  }, []);

  return (
    <Flex
      height="100%"
      alignItems="center"
      gap={2}
      px={4}
      bg="rgba(255, 255, 255, 0.7)"
      backdropFilter="auto"
      backdropBlur="10px"
      boxShadow="sm"
    >
      <Image src="/LogoMyPaste.svg" />
      <Spacer />
      <Popover>
        <PopoverTrigger>
          <Avatar size="md" name={user.Name} />
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader textAlign="center">{user.Name}</PopoverHeader>
          <PopoverBody textAlign="center">
            <Text fontSize="sm" mt={4} mb={6}>
              {user.Email}
            </Text>
            <Button
              leftIcon={<Icon as={MdLogout} boxSize={6} />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Flex>
  );
}

export default TopBar;
